import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

import ProductTriggerDialog from '@/features/mikrotik/components/ProductTriggerDialog.vue'
import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import type { TriggerPreview } from '@/features/mikrotik/types'

vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: { products: { triggerPreview: vi.fn(), setTrigger: vi.fn() } },
}))

function preview(over: Partial<TriggerPreview> = {}): TriggerPreview {
  return {
    product: { id: 'p1', name: 'Internet 50', sku: 'NET', recurring: true, active: true },
    active_contracts: 12,
    accounts: 9,
    overdue_invoices: 3,
    effective_from: '2026-11-02',
    already_enabled: false,
    ...over,
  }
}

async function mountDialog() {
  const w = mount(ProductTriggerDialog, {
    attachTo: document.body,
    props: { open: true, product: { id: 'p1', name: 'Internet 50' } },
    global: { plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]] },
  })
  await flushPromises()
  return w
}

const find = (label: string) =>
  Array.from(document.body.querySelectorAll('button')).find((b) => b.textContent?.trim() === label)

describe('ProductTriggerDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.mocked(mikrotikApi.products.triggerPreview).mockReset().mockResolvedValue(preview())
    vi.mocked(mikrotikApi.products.setTrigger)
      .mockReset()
      .mockResolvedValue({ product_id: 'p1', enabled: true, effective_from: '2026-11-02' })
  })

  it('shows the immediate impact and the effective date from the preview', async () => {
    await mountDialog()
    const text = document.body.textContent ?? ''
    expect(mikrotikApi.products.triggerPreview).toHaveBeenCalledWith('p1')
    expect(text).toMatch(/12\s*contract aktif/)
    expect(text).toMatch(/9\s*pelanggan/)
    expect(text).toMatch(/3\s*invoice overdue/)
    expect(text).toContain('2026')
  })

  it('does not offer a Mikrotik profile selection', async () => {
    await mountDialog()
    expect(document.body.querySelector('select')).toBeNull()
  })

  it('confirms with enabled:true', async () => {
    const w = await mountDialog()
    find('Aktifkan')?.click()
    await flushPromises()
    expect(mikrotikApi.products.setTrigger).toHaveBeenCalledWith('p1', true)
    expect(w.emitted('saved')).toBeTruthy()
  })

  it('offers disabling with the auto-restore note when already enabled', async () => {
    vi.mocked(mikrotikApi.products.triggerPreview).mockResolvedValue(
      preview({ already_enabled: true }),
    )
    await mountDialog()
    expect(document.body.textContent).toContain('dibuka otomatis')
    expect(find('Aktifkan')).toBeUndefined()
    find('Nonaktifkan')?.click()
    await flushPromises()
    expect(mikrotikApi.products.setTrigger).toHaveBeenCalledWith('p1', false)
  })
})
