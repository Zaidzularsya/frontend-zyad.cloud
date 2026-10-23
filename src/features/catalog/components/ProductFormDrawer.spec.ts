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

function mountDrawer(mode: 'platform' | 'workspace') {
  setActivePinia(createPinia())
  return mount(ProductFormDrawer, {
    props: { open: true, product: null, categories: [], mode },
    global: { plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]] },
    attachTo: document.body,
  })
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
})
