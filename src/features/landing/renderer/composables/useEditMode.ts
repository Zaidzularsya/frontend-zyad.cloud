import { computed, inject, provide, type ComputedRef, type InjectionKey, type Ref } from 'vue'

/**
 * Injection contract that lets renderer section components neutralise their
 * runtime side effects (data fetches, navigation, form POSTs, WebGL, scroll
 * listeners) when they are mounted inside the visual builder canvas instead of
 * a live public page.
 */
export const LANDING_EDIT_MODE: InjectionKey<Ref<boolean> | ComputedRef<boolean> | boolean> =
  Symbol('landingEditMode')

export function provideEditMode(value: Ref<boolean> | ComputedRef<boolean> | boolean): void {
  provide(LANDING_EDIT_MODE, value)
}

/** `true` only when rendered inside the builder canvas. Defaults to `false`. */
export function useEditMode(): ComputedRef<boolean> {
  const injected = inject(LANDING_EDIT_MODE, false)
  return computed(() => (typeof injected === 'boolean' ? injected : injected.value))
}
