import { onBeforeUnmount, ref } from 'vue'

/** True while the browser tab is visible; used to pause polling in background tabs. */
export function useDocumentVisible() {
  const visible = ref(typeof document === 'undefined' || document.visibilityState !== 'hidden')
  const update = () => {
    visible.value = document.visibilityState !== 'hidden'
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', update)
    onBeforeUnmount(() => document.removeEventListener('visibilitychange', update))
  }
  return visible
}
