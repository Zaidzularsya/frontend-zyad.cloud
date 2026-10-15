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
}

export const LANDING_PAGE_CONTEXT: InjectionKey<LandingPageContext> = Symbol('landing-page-context')

export function useLandingPageContext(): LandingPageContext {
  return (
    inject(LANDING_PAGE_CONTEXT, null) ?? {
      orgType: computed(() => ''),
      interest: ref(''),
      scrollToId: () => {},
    }
  )
}
