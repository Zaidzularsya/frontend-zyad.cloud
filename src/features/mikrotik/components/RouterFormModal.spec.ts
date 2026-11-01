import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

import RouterFormModal from '@/features/mikrotik/components/RouterFormModal.vue'
import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import { routerFixture } from '@/features/mikrotik/testing/fixtures'

vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: { routers: { create: vi.fn(), update: vi.fn() } },
}))

describe('RouterFormModal', () => {
  beforeEach(() => {
    vi.mocked(mikrotikApi.routers.update).mockReset().mockResolvedValue(routerFixture())
    vi.mocked(mikrotikApi.routers.create).mockReset().mockResolvedValue(routerFixture())
    document.body.innerHTML = ''
  })

  function mountForm(router?: ReturnType<typeof routerFixture>) {
    return mount(RouterFormModal, {
      props: { open: true, router },
      global: { plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]] },
      attachTo: document.body,
    })
  }

  it('omits password from PATCH when left empty', async () => {
    mountForm(routerFixture())
    await flushPromises()
    document.body.querySelector('form')?.dispatchEvent(new Event('submit'))
    await flushPromises()
    const payload = vi.mocked(mikrotikApi.routers.update).mock.calls[0]?.[1]
    expect(payload).toBeDefined()
    expect(payload).not.toHaveProperty('password')
    expect(payload).toMatchObject({ name: 'Core-1', host: '10.0.0.1', port: 8728 })
  })

  it('sends password on PATCH when filled', async () => {
    mountForm(routerFixture())
    await flushPromises()
    const input = document.body.querySelector('input[name="password"]') as HTMLInputElement
    input.value = 'rahasia'
    input.dispatchEvent(new Event('input'))
    document.body.querySelector('form')?.dispatchEvent(new Event('submit'))
    await flushPromises()
    expect(vi.mocked(mikrotikApi.routers.update).mock.calls[0]?.[1]).toMatchObject({
      password: 'rahasia',
    })
  })

  it('creates with port as number and password', async () => {
    mountForm()
    await flushPromises()
    const set = (name: string, value: string) => {
      const el = document.body.querySelector(`input[name="${name}"]`) as HTMLInputElement
      el.value = value
      el.dispatchEvent(new Event('input'))
    }
    set('name', 'R2')
    set('host', '10.0.0.2')
    set('port', '8729')
    set('username', 'zyad')
    set('password', 'pw')
    document.body.querySelector('form')?.dispatchEvent(new Event('submit'))
    await flushPromises()
    expect(mikrotikApi.routers.create).toHaveBeenCalledWith({
      name: 'R2',
      host: '10.0.0.2',
      port: 8729,
      username: 'zyad',
      password: 'pw',
      use_tls: false,
      tls_fingerprint: '',
    })
  })

  it('clears a stale fingerprint when TLS is off', async () => {
    mountForm(routerFixture({ use_tls: false, tls_fingerprint: 'AA:BB' }))
    await flushPromises()
    document.body.querySelector('form')?.dispatchEvent(new Event('submit'))
    await flushPromises()
    expect(vi.mocked(mikrotikApi.routers.update).mock.calls[0]?.[1]).toMatchObject({
      tls_fingerprint: '',
    })
  })

  it('offers to pin the fingerprint from a TLS_UNTRUSTED error', async () => {
    vi.mocked(mikrotikApi.routers.create).mockRejectedValueOnce({
      response: {
        data: {
          code: 'MIKROTIK_TLS_UNTRUSTED',
          message: 'x',
          data: { fingerprint: 'AA:BB:CC', pin_mismatch: false },
        },
      },
    })
    mountForm()
    await flushPromises()
    document.body.querySelector('form')?.dispatchEvent(new Event('submit'))
    await flushPromises()
    expect(document.body.textContent).toContain('Sidik jari: AA:BB:CC')
    const btn = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Pakai fingerprint ini'),
    )
    btn?.click()
    await flushPromises()
    const fp = document.body.querySelector('input[name="tls_fingerprint"]') as HTMLInputElement
    expect(fp.value).toBe('AA:BB:CC')
  })
})
