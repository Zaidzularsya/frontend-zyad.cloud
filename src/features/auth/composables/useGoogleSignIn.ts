import { nextTick, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'

import { env } from '@/config/env'

const GOOGLE_AUTH_REDIRECT_KEY = 'zyad.google-auth.redirect'

interface UseGoogleSignInOptions {
  /** Ref ke elemen container tempat tombol Google dirender. */
  buttonRef: Ref<HTMLElement | null>
  /** Teks tombol GIS ('signin_with' untuk login, 'signup_with' untuk register). */
  text?: 'signin_with' | 'signup_with' | 'continue_with'
  /** Path SPA yang harus dituju setelah login Google selesai (dibaca GoogleCallbackPage). */
  redirectPath?: () => string | undefined
}

let googleScriptPromise: Promise<void> | null = null

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (googleScriptPromise) return googleScriptPromise

  googleScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    )
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('google script failed')), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('google script failed'))
    document.head.appendChild(script)
  })

  return googleScriptPromise
}

function googleLoginUri() {
  return `${env.VITE_API_BASE_URL.replace(/\/api\/v1\/?$/, '')}/api/v1/auth/google/callback`
}

/**
 * Google Identity Services sign-in yang dipakai bersama LoginPage dan
 * RegisterPage: memuat script GIS, merender tombol resmi Google dalam mode
 * ux_mode: 'redirect' (full-page navigation di tab yang sama, bukan popup),
 * lalu Google POST credential langsung ke backend (`/auth/google/callback`).
 * Backend redirect balik ke GoogleCallbackPage dengan one-time code yang
 * ditukar via authApi.googleExchange().
 */
export function useGoogleSignIn(options: UseGoogleSignInOptions) {
  const googleError = ref('')
  const isGoogleSubmitting = ref(false)
  const googleEnabled = Boolean(env.VITE_GOOGLE_CLIENT_ID)

  let disposed = false

  // GIS redirect-mode tidak meneruskan state kustom ke login_uri, jadi
  // tujuan redirect pasca-login disimpan di sessionStorage sebelum tab
  // meninggalkan origin ini, lalu dibaca kembali oleh GoogleCallbackPage
  // saat backend redirect balik ke tab yang sama.
  watch(
    () => options.redirectPath?.(),
    (redirectPath) => {
      if (redirectPath) {
        sessionStorage.setItem(GOOGLE_AUTH_REDIRECT_KEY, redirectPath)
      } else {
        sessionStorage.removeItem(GOOGLE_AUTH_REDIRECT_KEY)
      }
    },
    { immediate: true },
  )

  async function renderGoogleButton() {
    if (!googleEnabled) return

    try {
      await loadGoogleScript()
      await nextTick()
      if (disposed || !options.buttonRef.value || !window.google?.accounts?.id) return

      options.buttonRef.value.innerHTML = ''
      window.google.accounts.id.initialize({
        client_id: env.VITE_GOOGLE_CLIENT_ID,
        ux_mode: 'redirect',
        login_uri: googleLoginUri(),
        auto_select: false,
        cancel_on_tap_outside: true,
      })
      window.google.accounts.id.renderButton(options.buttonRef.value, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: options.text ?? 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: options.buttonRef.value.clientWidth || 384,
      })
    } catch {
      googleError.value = 'Tombol Google belum bisa dimuat. Coba refresh halaman.'
    }
  }

  onMounted(() => {
    void renderGoogleButton()
  })

  onUnmounted(() => {
    disposed = true
    window.google?.accounts?.id?.cancel()
  })

  return { googleEnabled, googleError, isGoogleSubmitting }
}

export function consumeGoogleAuthRedirect(): string | undefined {
  const redirect = sessionStorage.getItem(GOOGLE_AUTH_REDIRECT_KEY) ?? undefined
  sessionStorage.removeItem(GOOGLE_AUTH_REDIRECT_KEY)
  return redirect
}
