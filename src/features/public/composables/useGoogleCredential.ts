import { onMounted, onUnmounted, ref, type Ref } from 'vue'

import { loadGoogleScript } from '@/features/auth/composables/useGoogleSignIn'
import { env } from '@/config/env'

/**
 * Google Identity Services dalam mode popup: callback menerima ID token (credential)
 * di JS tanpa meninggalkan halaman. Dipakai checkout tenant, yang tidak menerbitkan sesi
 * sehingga alur redirect `/auth/google/callback` milik login tidak cocok.
 */
export function useGoogleCredential(options: {
  buttonRef: Ref<HTMLElement | null>
  onCredential: (credential: string) => void
}) {
  const googleEnabled = Boolean(env.VITE_GOOGLE_CLIENT_ID)
  const googleError = ref('')
  let disposed = false

  onMounted(async () => {
    if (!googleEnabled) return
    try {
      await loadGoogleScript()
      const el = options.buttonRef.value
      if (disposed || !el || !window.google?.accounts?.id) return
      el.innerHTML = ''
      window.google.accounts.id.initialize({
        client_id: env.VITE_GOOGLE_CLIENT_ID,
        ux_mode: 'popup',
        auto_select: false,
        callback: (response) => {
          if (response.credential) options.onCredential(response.credential)
        },
      })
      window.google.accounts.id.renderButton(el, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: Math.min(Math.max(Math.round(el.clientWidth || 320), 200), 400),
      })
    } catch {
      googleError.value = 'Tombol Google belum bisa dimuat. Coba refresh halaman.'
    }
  })

  onUnmounted(() => {
    disposed = true
    window.google?.accounts?.id?.cancel()
  })

  return { googleEnabled, googleError }
}
