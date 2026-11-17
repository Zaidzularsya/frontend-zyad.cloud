import { computed, inject, ref, type ComputedRef, type InjectionKey, type Ref } from 'vue'

/**
 * Konteks bersama untuk slot di dalam ShadowPageRenderer: tipe org tenant,
 * minat yang dipilih pengunjung, dan scroll ke anchor di dalam shadow root.
 */
export interface LandingPageContext {
  /** '' bila tidak diketahui. */
  orgType: ComputedRef<string>
  interest: Ref<string>
  /** Smooth scroll di dalam shadow root + perbarui hash URL; no-op bila id tidak ada. */
  scrollToId(id: string): void
  /** Daftarkan pembuka popup Form Konsultasi; mengembalikan fungsi untuk mencabutnya. */
  registerLeadPopup(open: () => void): () => void
  /** true bila ada popup terdaftar dan sudah dibuka. */
  openLeadPopup(): boolean
  /** Elemen overlay di tingkat shadow root (di luar section beranimasi); null di luar renderer. */
  overlayTarget: Ref<HTMLElement | null>
}

/** Anchor CTA yang menuju form konsultasi; bila halaman memakai popup, anchor ini membukanya. */
export const LEAD_FORM_ANCHOR = 'konsultasi'

export const LANDING_PAGE_CONTEXT: InjectionKey<LandingPageContext> = Symbol('landing-page-context')

export function useLandingPageContext(): LandingPageContext {
  return (
    inject(LANDING_PAGE_CONTEXT, null) ?? {
      orgType: computed(() => ''),
      interest: ref(''),
      scrollToId: () => {},
      registerLeadPopup: () => () => {},
      openLeadPopup: () => false,
      overlayTarget: ref(null),
    }
  )
}
