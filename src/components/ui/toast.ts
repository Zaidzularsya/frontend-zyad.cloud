import { readonly, ref } from 'vue'

export type ToastTone = 'success' | 'error'

export interface Toast {
  id: number
  tone: ToastTone
  message: string
}

const TOAST_DURATION_MS = 4000

// Module-level so any component can push a toast and the single <ToastHost>
// in App.vue renders it. Replaces ad-hoc alert() calls.
const toasts = ref<Toast[]>([])
let nextId = 1

function dismiss(id: number) {
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
}

function push(tone: ToastTone, message: string) {
  const id = nextId++
  toasts.value = [...toasts.value, { id, tone, message }]
  setTimeout(() => dismiss(id), TOAST_DURATION_MS)
}

export function useToast() {
  return {
    toasts: readonly(toasts),
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
    dismiss,
  }
}
