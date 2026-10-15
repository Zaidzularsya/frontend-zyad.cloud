import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useToast } from '@/components/ui/toast'

describe('useToast', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows a toast and removes it after 4 seconds', () => {
    const toast = useToast()
    toast.success('Tersimpan')
    expect(toast.toasts.value.at(-1)).toMatchObject({ tone: 'success', message: 'Tersimpan' })

    const id = toast.toasts.value.at(-1)!.id
    vi.advanceTimersByTime(4000)
    expect(toast.toasts.value.some((item) => item.id === id)).toBe(false)
  })

  it('can be dismissed early', () => {
    const toast = useToast()
    toast.error('Gagal')
    const id = toast.toasts.value.at(-1)!.id
    toast.dismiss(id)
    expect(toast.toasts.value.some((item) => item.id === id)).toBe(false)
  })
})
