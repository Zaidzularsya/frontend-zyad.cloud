import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'

const { features, createProduct, can } = vi.hoisted(() => ({
  features: vi.fn(),
  createProduct: vi.fn(),
  can: vi.fn(),
}))

vi.mock('@/features/catalog/api/catalog.api', () => ({
  catalogApi: {
    features,
    createProduct,
    updateProduct: createProduct,
  },
}))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => ({ can }) }))

import ProductFormDrawer from './ProductFormDrawer.vue'

const tenantFeatures = [
  { key: 'lead', name: 'Lead', module: 'crm', value_type: 'integer', tenant_max: 10 },
  { key: 'crm', name: 'CRM', module: 'crm', value_type: 'boolean' },
  { key: 'fee', name: 'Fee', module: 'core', value_type: 'decimal' },
]

const storedProduct = {
  id: 'p1',
  category_id: null,
  name: 'Paket A',
  unit: 'pcs',
  base_price: '1000.00',
  tax_percent: '0.00',
  currency: 'IDR',
  charge_type: 'one_time',
  billing_frequency: null,
  payment_timing: 'prepaid',
  is_active: true,
  created_at: '',
  updated_at: '',
  features: [{ feature_key: 'lead', value: 5, position: 0 }],
}

function mountDrawer(mode: 'platform' | 'workspace', product: unknown = null) {
  setActivePinia(createPinia())
  const w = mount(ProductFormDrawer, {
    props: { open: false, product: product as never, categories: [], mode },
    global: {
      plugins: [
        [
          VueQueryPlugin,
          { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        ],
      ],
    },
    attachTo: document.body,
  })
  void w.setProps({ open: true })
  return w
}

const body = () => document.body

async function fillAndSubmit(name = 'Paket A') {
  const nameInput = body().querySelector('input[name="name"]') as HTMLInputElement
  nameInput.value = name
  nameInput.dispatchEvent(new Event('input'))
  await flushPromises()
  body()
    .querySelector('form')!
    .dispatchEvent(new Event('submit', { cancelable: true }))
  await flushPromises()
}

describe('ProductFormDrawer entitlement section', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    features.mockReset().mockResolvedValue(tenantFeatures)
    createProduct.mockReset().mockResolvedValue({ id: 'p1' })
    can.mockReset()
  })

  it('tenant with permission sees Advanced collapsed by default and only offerable boolean/integer features when opened', async () => {
    can.mockImplementation((p: string) => p === 'catalog_product.manage_entitlements')
    const w = mountDrawer('workspace')
    await flushPromises()
    const toggle = body().querySelector('[data-testid="advanced-toggle"]') as HTMLButtonElement
    expect(toggle).not.toBeNull()
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(body().querySelector('[data-testid="entitlement-row"]')).toBeNull()

    toggle.click()
    await flushPromises()
    const keys = [...body().querySelectorAll('[data-testid="entitlement-row"]')].map((r) =>
      r.getAttribute('data-key'),
    )
    expect(keys).toEqual(['lead', 'crm'])
    w.unmount()
  })

  it('blocks submit with "Maksimum 10" when limit is 11', async () => {
    can.mockReturnValue(true)
    const w = mountDrawer('workspace')
    await flushPromises()
    ;(body().querySelector('[data-testid="advanced-toggle"]') as HTMLButtonElement).click()
    await flushPromises()
    const status = body().querySelector(
      '[data-key="lead"] select[name="status"]',
    ) as HTMLSelectElement
    status.value = 'quota'
    status.dispatchEvent(new Event('change'))
    await flushPromises()
    const limit = body().querySelector('[data-key="lead"] input[name="limit"]') as HTMLInputElement
    limit.value = '11'
    limit.dispatchEvent(new Event('change'))
    await flushPromises()
    expect(body().textContent).toContain('Maksimum 10')

    await fillAndSubmit()
    expect(createProduct).not.toHaveBeenCalled()
    expect(body().querySelector('[role="alert"]')!.textContent).toContain('Maksimum 10')
    w.unmount()
  })

  it('tenant without permission has no Advanced and sends no features key', async () => {
    can.mockReturnValue(false)
    const w = mountDrawer('workspace')
    await flushPromises()
    expect(body().querySelector('[data-testid="advanced-toggle"]')).toBeNull()
    expect(features).not.toHaveBeenCalled()
    await fillAndSubmit()
    expect(createProduct).toHaveBeenCalledTimes(1)
    const payload = createProduct.mock.calls[0]!.at(-1)
    expect(payload).not.toHaveProperty('features')
    w.unmount()
  })

  it('platform mode still shows the entitlement table without Advanced and sends features', async () => {
    can.mockReturnValue(false)
    const w = mountDrawer('platform')
    await flushPromises()
    expect(body().querySelector('[data-testid="advanced-toggle"]')).toBeNull()
    expect(body().querySelector('[data-testid="entitlement-row"]')).not.toBeNull()
    await fillAndSubmit()
    expect(createProduct).toHaveBeenCalledTimes(1)
    expect(createProduct.mock.calls[0]!.at(-1)).toHaveProperty('features', [])
    w.unmount()
  })

  it('tenant without permission editing a product with features sends no features and skips the endpoint', async () => {
    can.mockReturnValue(false)
    const w = mountDrawer('workspace', storedProduct)
    await flushPromises()
    await fillAndSubmit()
    expect(features).not.toHaveBeenCalled()
    expect(createProduct).toHaveBeenCalledTimes(1)
    expect(createProduct.mock.calls[0]![0]).toBe('p1')
    expect(createProduct.mock.calls[0]!.at(-1)).not.toHaveProperty('features')
    w.unmount()
  })

  it('needs_update product with a no-longer-offerable feature: opens Advanced, blocks submit, Hapus drops the stale key', async () => {
    can.mockReturnValue(true)
    const w = mountDrawer('workspace', {
      ...storedProduct,
      needs_update: true,
      features: [
        { feature_key: 'lead', value: 5, position: 0 },
        { feature_key: 'gone', value: 3, position: 1 },
      ],
    })
    await flushPromises()
    expect(
      body().querySelector('[data-testid="advanced-toggle"]')!.getAttribute('aria-expanded'),
    ).toBe('true')
    expect(body().querySelector('[data-testid="orphan-row"][data-key="gone"]')).not.toBeNull()

    await fillAndSubmit()
    expect(createProduct).not.toHaveBeenCalled()
    ;(body().querySelector('[data-testid="orphan-row"] button') as HTMLButtonElement).click()
    await flushPromises()
    await fillAndSubmit()
    expect(createProduct).toHaveBeenCalledTimes(1)
    const keys = (
      createProduct.mock.calls[0]!.at(-1) as { features: { feature_key: string }[] }
    ).features.map((f) => f.feature_key)
    expect(keys).toEqual(['lead'])
    w.unmount()
  })

  it('over-max stored value blocks submit and auto-opens Advanced', async () => {
    can.mockReturnValue(true)
    const w = mountDrawer('workspace', {
      ...storedProduct,
      features: [{ feature_key: 'lead', value: 11, position: 0 }],
    })
    await flushPromises()
    expect(
      body().querySelector('[data-testid="advanced-toggle"]')!.getAttribute('aria-expanded'),
    ).toBe('false')
    await fillAndSubmit()
    expect(createProduct).not.toHaveBeenCalled()
    expect(body().querySelector('[role="alert"]')!.textContent).toContain('Maksimum 10')
    expect(
      body().querySelector('[data-testid="advanced-toggle"]')!.getAttribute('aria-expanded'),
    ).toBe('true')
    w.unmount()
  })

  it('features fetch error shows inline error with retry and still saves without features', async () => {
    can.mockReturnValue(true)
    features.mockRejectedValue(new Error('boom'))
    const w = mountDrawer('workspace', storedProduct)
    await flushPromises()
    ;(body().querySelector('[data-testid="advanced-toggle"]') as HTMLButtonElement).click()
    await flushPromises()
    expect(body().querySelector('[data-testid="features-error"]')).not.toBeNull()

    features.mockResolvedValue(tenantFeatures)
    ;(body().querySelector('[data-testid="features-retry"]') as HTMLButtonElement).click()
    await flushPromises()
    expect(body().querySelector('[data-testid="features-error"]')).toBeNull()
    expect(body().querySelector('[data-testid="entitlement-row"]')).not.toBeNull()
    w.unmount()
  })

  it('features fetch error does not block saving other fields and sends no features', async () => {
    can.mockReturnValue(true)
    features.mockRejectedValue(new Error('boom'))
    const w = mountDrawer('workspace', storedProduct)
    await flushPromises()
    await fillAndSubmit()
    expect(createProduct).toHaveBeenCalledTimes(1)
    expect(createProduct.mock.calls[0]!.at(-1)).not.toHaveProperty('features')
    w.unmount()
  })
})
