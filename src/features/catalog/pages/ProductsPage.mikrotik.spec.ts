import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'

const { perms, summary, unmarked, triggers } = vi.hoisted(() => ({
  perms: { value: new Set<string>() },
  summary: vi.fn(),
  unmarked: vi.fn(),
  triggers: vi.fn(),
}))

vi.mock('@/features/catalog/api/catalog.api', () => ({
  catalogApi: {
    products: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'p1',
          name: 'Internet 50 Mbps',
          sku: 'NET-50',
          unit: 'bulan',
          base_price: '350000.00',
          tax_percent: '11.00',
          currency: 'IDR',
          is_active: true,
          category_id: null,
          created_at: '',
          updated_at: '',
        },
      ],
      meta: { total: 1 },
    }),
    categories: vi.fn().mockResolvedValue([]),
  },
}))
vi.mock('@/features/entitlements/api/entitlements.api', () => ({
  entitlementsApi: { summary },
}))
vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: {
    products: { unmarked, triggers, triggerPreview: vi.fn(), setTrigger: vi.fn() },
  },
}))
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({ can: (p: string) => perms.value.has(p) }),
}))

import ProductsPage from './ProductsPage.vue'

const ON = [{ feature_key: 'mikrotik.enabled', state: 'enabled' }]

async function mountPage() {
  setActivePinia(createPinia())
  const w = mount(ProductsPage, {
    global: {
      plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]],
      stubs: ['PageHeader'],
    },
  })
  await flushPromises()
  return w
}

const TRIGGER_PERMS = ['mikrotik_product_trigger.read', 'mikrotik_product_trigger.update']

describe('ProductsPage isolir trigger', () => {
  beforeEach(() => {
    summary.mockReset().mockResolvedValue(ON)
    unmarked.mockReset().mockResolvedValue([])
    triggers.mockReset().mockResolvedValue([])
    perms.value = new Set(TRIGGER_PERMS)
  })

  it('shows the action when the feature is on and the user may update triggers', async () => {
    const w = await mountPage()
    expect(w.find('[aria-label="Memicu isolir Internet 50 Mbps"]').exists()).toBe(true)
  })

  it('hides the action when the feature is off', async () => {
    summary.mockResolvedValue([{ feature_key: 'mikrotik.enabled', state: 'hidden' }])
    const w = await mountPage()
    expect(w.find('[aria-label="Memicu isolir Internet 50 Mbps"]').exists()).toBe(false)
    expect(triggers).not.toHaveBeenCalled()
    expect(unmarked).not.toHaveBeenCalled()
  })

  it('hides the action without the update permission', async () => {
    perms.value = new Set(['mikrotik_product_trigger.read'])
    const w = await mountPage()
    expect(w.find('[aria-label="Memicu isolir Internet 50 Mbps"]').exists()).toBe(false)
  })

  it('badges products whose trigger is enabled', async () => {
    triggers.mockResolvedValue([
      {
        product_id: 'p1',
        enabled: true,
        effective_from: '2026-11-01',
        product_name: 'x',
        product_sku: '',
      },
    ])
    const w = await mountPage()
    expect(w.find('[data-testid="isolir-badge"]').exists()).toBe(true)
  })

  it('warns, without blocking, about recurring products not yet marked', async () => {
    unmarked.mockResolvedValue([
      { id: 'p9', name: 'A', sku: '', recurring: true, active: true },
      { id: 'p8', name: 'B', sku: '', recurring: true, active: true },
    ])
    const w = await mountPage()
    expect(w.text()).toContain('2 produk recurring dipakai contract aktif belum ditandai')
    expect(w.text()).toContain('Internet 50 Mbps')
  })

  it('does not show the warning without trigger read access', async () => {
    perms.value = new Set()
    unmarked.mockResolvedValue([{ id: 'p9', name: 'A', sku: '', recurring: true, active: true }])
    const w = await mountPage()
    expect(w.text()).not.toContain('belum ditandai')
  })
})
