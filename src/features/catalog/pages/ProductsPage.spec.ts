import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'

const { products } = vi.hoisted(() => ({
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
        category_id: 'c1',
        category_name: 'Internet',
        created_at: '',
        updated_at: '',
      },
      {
        id: 'p2',
        name: 'Router lama',
        unit: 'pcs',
        base_price: '0.00',
        tax_percent: '0.00',
        currency: 'IDR',
        is_active: false,
        category_id: null,
        created_at: '',
        updated_at: '',
      },
    ],
    meta: { total: 2 },
  }),
}))
vi.mock('@/features/catalog/api/catalog.api', () => ({
  catalogApi: {
    products,
    categories: vi.fn().mockResolvedValue([{ id: 'c1', name: 'Internet', position: 0 }]),
  },
}))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => ({ can: () => true }) }))

import ProductsPage from './ProductsPage.vue'

describe('ProductsPage', () => {
  it('lists products with price, tax and status', async () => {
    setActivePinia(createPinia())
    const w = mount(ProductsPage, {
      global: {
        plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]],
        stubs: ['PageHeader'],
      },
    })
    await flushPromises()
    expect(w.text()).toContain('Internet 50 Mbps')
    expect(w.text()).toContain('NET-50')
    expect(w.text()).toContain('350.000')
    expect(w.text()).toContain('11%')
    expect(w.text()).toContain('Nonaktif')
  })

  it('passes search and active filter to the API', async () => {
    setActivePinia(createPinia())
    const w = mount(ProductsPage, {
      global: {
        plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]],
        stubs: ['PageHeader'],
      },
    })
    await flushPromises()
    await w.get('input[name="product-search"]').setValue('net')
    await w.get('select[name="product-status"]').setValue('active')
    // Pencarian di-debounce 300 ms.
    await new Promise((resolve) => setTimeout(resolve, 350))
    await flushPromises()
    expect(products).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: 'net', is_active: true }),
    )
  })
})
