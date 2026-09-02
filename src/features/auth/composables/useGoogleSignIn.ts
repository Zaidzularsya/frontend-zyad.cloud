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
  // Wajib same-origin dengan halaman ini (bukan host VITE_API_BASE_URL):
  // cookie `g_csrf_token` yang di-set GIS discope ke origin saat ini, dan
  // browser tidak mengirim cookie itu lintas-subdomain ke login_uri. Nginx
  // di setiap domain (termasuk custom domain tenant) sudah proxy `/api/`
  // ke backend yang sama, jadi path relatif ini tetap valid di mana pun.
  return `${window.location.origin}/api/v1/auth/google/callback`
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

  let resizeObserver: ResizeObserver | null = null
  let resizeRenderScheduled = false
  let lastRenderedWidth = 0

  function measuredWidth(el: HTMLElement): number {
    // GIS hanya mendukung width dalam rentang ~200-400px; nilai di luar itu
    // diabaikan/di-cap oleh Google, jadi kita clamp secara eksplisit supaya
    // tombol selalu punya lebar yang valid dan konsisten dengan lebar kontainer.
    const rectWidth = el.getBoundingClientRect().width || el.clientWidth
    return Math.min(Math.max(Math.round(rectWidth), 200), 400)
  }

  async function renderGoogleButton() {
    if (!googleEnabled) return

    try {
      await loadGoogleScript()
      await nextTick()
      // Tunggu satu frame lagi agar layout (font, flex, grid) benar-benar
      // settle sebelum lebar kontainer diukur — clientWidth yang dibaca
      // langsung setelah nextTick sering masih 0 atau nilai transisi awal.
      await new Promise((resolve) => requestAnimationFrame(resolve))
      if (disposed || !options.buttonRef.value || !window.google?.accounts?.id) return

      const width = measuredWidth(options.buttonRef.value)
      if (width === lastRenderedWidth && options.buttonRef.value.childElementCount > 0) return
      lastRenderedWidth = width

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
        width,
      })
    } catch {
      googleError.value = 'Tombol Google belum bisa dimuat. Coba refresh halaman.'
    }
  }

  onMounted(() => {
    void renderGoogleButton()

    if (options.buttonRef.value && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => {
        if (resizeRenderScheduled) return
        resizeRenderScheduled = true
        requestAnimationFrame(() => {
          resizeRenderScheduled = false
          void renderGoogleButton()
        })
      })
      resizeObserver.observe(options.buttonRef.value)
    }
  })

  onUnmounted(() => {
    disposed = true
    resizeObserver?.disconnect()
    window.google?.accounts?.id?.cancel()
  })

  return { googleEnabled, googleError, isGoogleSubmitting }
}

export function consumeGoogleAuthRedirect(): string | undefined {
  const redirect = sessionStorage.getItem(GOOGLE_AUTH_REDIRECT_KEY) ?? undefined
  sessionStorage.removeItem(GOOGLE_AUTH_REDIRECT_KEY)
  return redirect
}
