import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

vi.mock('@/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/env')>()
  return {
    ...actual,
    platformHost: 'zyad.cloud',
    env: { ...actual.env, VITE_GOOGLE_CLIENT_ID: 'client-id.apps.googleusercontent.com' },
  }
})

const replace = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ replace }) }))

const loginWithGoogle = vi.fn()
const authStub = { user: null as unknown, loginWithGoogle }
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => authStub }))

import { isTenantHost, useGoogleSignIn } from './useGoogleSignIn'

type InitConfig = Parameters<NonNullable<Window['google']>['accounts']['id']['initialize']>[0]

const initialize = vi.fn<(config: InitConfig) => void>()
const renderButton = vi.fn()

function initConfig(): InitConfig {
  const call = initialize.mock.calls[0]
  if (!call) throw new Error('google.accounts.id.initialize belum dipanggil')
  return call[0]
}

function installGoogle() {
  window.google = { accounts: { id: { initialize, renderButton, cancel: vi.fn() } } }
}

function setHostname(hostname: string) {
  vi.stubGlobal('location', {
    ...window.location,
    hostname,
    origin: `https://${hostname}`,
  })
}

function mountComposable(redirectPath?: () => string | undefined) {
  let exposed!: ReturnType<typeof useGoogleSignIn>
  const Host = defineComponent({
    setup() {
      const buttonRef = ref<HTMLElement | null>(null)
      exposed = useGoogleSignIn({ buttonRef, redirectPath })
      return () => h('div', { ref: buttonRef })
    },
  })
  const wrapper = mount(Host, { attachTo: document.body })
  return { wrapper, exposed }
}

async function settle() {
  // loadGoogleScript resolves immediately (window.google already installed), then the
  // composable waits one animation frame before rendering the button.
  await new Promise((resolve) => setTimeout(resolve, 30))
}

describe('isTenantHost', () => {
  it('menganggap host selain host platform sebagai host tenant', () => {
    expect(isTenantHost('zyad.cloud')).toBe(false)
    expect(isTenantHost('ethernet.zyad.cloud')).toBe(true)
    expect(isTenantHost('undangan.contoh.com')).toBe(true)
  })
})

describe('useGoogleSignIn', () => {
  beforeEach(() => {
    installGoogle()
    initialize.mockReset()
    renderButton.mockReset()
    replace.mockReset()
    loginWithGoogle.mockReset()
    authStub.user = null
    sessionStorage.clear()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    delete window.google
  })

  it('host platform: tetap mode redirect dengan login_uri same-origin', async () => {
    setHostname('zyad.cloud')
    const { wrapper } = mountComposable(() => '/app/leads')
    await settle()

    expect(initialize).toHaveBeenCalledTimes(1)
    const config = initConfig()
    expect(config.ux_mode).toBe('redirect')
    expect(config.login_uri).toBe('https://zyad.cloud/api/v1/auth/google/callback')
    expect(config.callback).toBeUndefined()
    expect(sessionStorage.getItem('zyad.google-auth.redirect')).toBe('/app/leads')
    wrapper.unmount()
  })

  it('host tenant: mode popup tanpa login_uri (tidak butuh redirect URI di Google Console)', async () => {
    setHostname('ethernet.zyad.cloud')
    const { wrapper } = mountComposable(() => '/app/leads')
    await settle()

    expect(initialize).toHaveBeenCalledTimes(1)
    const config = initConfig()
    expect(config.ux_mode).toBe('popup')
    expect(config.login_uri).toBeUndefined()
    expect(typeof config.callback).toBe('function')
    // Alur popup tidak meninggalkan halaman, jadi tidak ada state redirect yang perlu disimpan.
    expect(sessionStorage.getItem('zyad.google-auth.redirect')).toBeNull()
    wrapper.unmount()
  })

  it('host tenant: credential dari popup dikirim ke POST /auth/google lalu diarahkan', async () => {
    setHostname('ethernet.zyad.cloud')
    loginWithGoogle.mockResolvedValue(undefined)
    const { wrapper, exposed } = mountComposable(() => '/app/landing-pages')
    await settle()

    initConfig().callback?.({ credential: 'id-token-123' })
    await settle()

    expect(loginWithGoogle).toHaveBeenCalledWith({ idToken: 'id-token-123' })
    expect(replace).toHaveBeenCalledWith('/app/landing-pages')
    expect(exposed.googleError.value).toBe('')
    expect(exposed.isGoogleSubmitting.value).toBe(false)
    wrapper.unmount()
  })

  it('host tenant: tanpa redirect eksplisit memakai tujuan default pasca-login', async () => {
    setHostname('ethernet.zyad.cloud')
    loginWithGoogle.mockResolvedValue(undefined)
    const { wrapper } = mountComposable()
    await settle()

    initConfig().callback?.({ credential: 'tok' })
    await settle()

    expect(replace).toHaveBeenCalledWith('/app/dashboard')
    wrapper.unmount()
  })

  it('host tenant: login gagal menampilkan galat dan tidak berpindah halaman', async () => {
    setHostname('ethernet.zyad.cloud')
    loginWithGoogle.mockRejectedValue(new Error('401'))
    const { wrapper, exposed } = mountComposable()
    await settle()

    initConfig().callback?.({ credential: 'bad' })
    await settle()

    expect(replace).not.toHaveBeenCalled()
    expect(exposed.googleError.value).toContain('Login Google belum berhasil')
    expect(exposed.isGoogleSubmitting.value).toBe(false)
    wrapper.unmount()
  })

  it('host tenant: callback tanpa credential diabaikan', async () => {
    setHostname('ethernet.zyad.cloud')
    const { wrapper } = mountComposable()
    await settle()

    initConfig().callback?.({})
    await settle()

    expect(loginWithGoogle).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
