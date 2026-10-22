import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import type { CatalogFeatureDef } from '@/features/catalog/api/catalog.api'
import {
  buildProductPayload,
  emptyProductForm,
  productToForm,
  validateProductForm,
  type ProductForm,
} from '@/features/catalog/utils/product-form'

import ProductEntitlementTable from './ProductEntitlementTable.vue'

const defs: CatalogFeatureDef[] = [
  { key: 'lead', name: 'Lead', module: 'crm', value_type: 'integer', reset_strategy: 'never' },
  {
    key: 'quotation',
    name: 'Quotation',
    module: 'crm',
    value_type: 'integer',
    reset_strategy: 'monthly',
  },
  { key: 'crm', name: 'CRM', module: 'crm', value_type: 'boolean', reset_strategy: 'never' },
  { key: 'domain', name: 'Custom domain', module: 'landing', value_type: 'boolean' },
  { key: 'fee', name: 'Fee', module: 'landing', value_type: 'decimal' },
]

function mountWith(form: ProductForm = emptyProductForm()) {
  return mount(ProductEntitlementTable, { props: { modelValue: form, defs } })
}

const row = (w: ReturnType<typeof mountWith>, key: string) =>
  w.get(`[data-testid="entitlement-row"][data-key="${key}"]`)

describe('ProductEntitlementTable', () => {
  it('renders one row per feature grouped by module', () => {
    const w = mountWith()
    const groups = w.findAll('[data-testid="entitlement-group"]')
    expect(groups.map((g) => g.attributes('data-module'))).toEqual(['crm', 'landing'])
    // decimal tidak didukung tabel ini.
    expect(w.findAll('[data-testid="entitlement-row"]')).toHaveLength(4)
    expect(w.find('[data-key="fee"]').exists()).toBe(false)
    expect(row(w, 'lead').text()).toContain('Lead')
    expect(row(w, 'lead').text()).toContain('lead')
  })

  it('limits the status options by value type', () => {
    const w = mountWith()
    const opts = (k: string) =>
      row(w, k)
        .findAll('option')
        .map((o) => o.text())
    expect(opts('crm')).toEqual(['Tidak diatur', 'Penuh', 'Disembunyikan'])
    expect(opts('lead')).toEqual(['Tidak diatur', 'Berkuota'])
  })

  it('limit input disabled for hidden and unlimited', () => {
    const form: ProductForm = {
      ...emptyProductForm(),
      features: [
        { key: 'crm', raw: true, displayLabel: '' },
        { key: 'lead', raw: '50', displayLabel: '' },
      ],
    }
    const w = mountWith(form)
    const limit = (k: string) => row(w, k).get('input[name="limit"]')
    expect(limit('crm').attributes('disabled')).toBeDefined() // unlimited
    expect(limit('domain').attributes('disabled')).toBeDefined() // unset
    expect(limit('lead').attributes('disabled')).toBeUndefined()
    expect((limit('lead').element as HTMLInputElement).value).toBe('50')
  })

  it('reset column is read-only and reflects registry', () => {
    const w = mountWith({
      ...emptyProductForm(),
      features: [
        { key: 'lead', raw: '5', displayLabel: '' },
        { key: 'quotation', raw: '5', displayLabel: '' },
      ],
    })
    expect(row(w, 'lead').get('[data-testid="reset"]').text()).toBe('Total')
    expect(row(w, 'quotation').get('[data-testid="reset"]').text()).toBe('Bulanan')
    expect(row(w, 'lead').find('select[name="reset"], input[name="reset"]').exists()).toBe(false)
  })

  it('emits only the explicitly set rows and shows the counter', async () => {
    const w = mountWith()
    expect(w.get('[data-testid="entitlement-counter"]').text()).toBe('0 / 30 fitur')
    await row(w, 'crm').get('select[name="status"]').setValue('unlimited')
    const form = (w.emitted('update:modelValue') as ProductForm[][]).at(-1)![0]!
    expect(form.features).toEqual([{ key: 'crm', raw: true, displayLabel: '' }])
    const w2 = mountWith({ ...emptyProductForm(), features: [] })
    await row(w2, 'lead').get('select[name="status"]').setValue('quota')
    await row(w2, 'lead').get('input[name="limit"]').setValue('50')
    const f2 = (w2.emitted('update:modelValue') as ProductForm[][]).at(-1)![0]!
    expect(f2.features).toEqual([{ key: 'lead', raw: '50', displayLabel: '' }])
  })

  it('choosing Disembunyikan on a not-set row writes an explicit false', async () => {
    const w = mountWith()
    await row(w, 'domain').get('select[name="status"]').setValue('hidden')
    const form = (w.emitted('update:modelValue') as ProductForm[][]).at(-1)![0]!
    expect(form.features).toEqual([{ key: 'domain', raw: false, displayLabel: '' }])
  })

  it('choosing Tidak diatur removes a stored row and frees the counter', async () => {
    const w = mountWith({
      ...emptyProductForm(),
      features: [{ key: 'domain', raw: false, displayLabel: '' }],
    })
    await row(w, 'domain').get('select[name="status"]').setValue('unset')
    const form = (w.emitted('update:modelValue') as ProductForm[][]).at(-1)![0]!
    expect(form.features).toEqual([])
  })

  it('re-syncs the limit input after a rejected value', async () => {
    const w = mountWith({
      ...emptyProductForm(),
      features: [{ key: 'lead', raw: '50', displayLabel: '' }],
    })
    const input = row(w, 'lead').get('input[name="limit"]')
    await input.setValue('-3')
    expect(w.get('[role="alert"]').text()).toMatch(/bilangan bulat/)
    expect((input.element as HTMLInputElement).value).toBe('50')
  })

  describe('orphan keys', () => {
    const orphanForm = (): ProductForm => ({
      ...emptyProductForm(),
      name: 'P',
      basePrice: '1',
      features: [
        { key: 'crm', raw: true, displayLabel: '' },
        { key: 'legacy_x', raw: true, displayLabel: '' },
      ],
    })

    it('lists orphans and removing one drops it from the payload', async () => {
      const w = mountWith(orphanForm())
      expect(w.get('[data-testid="orphan-section"]').text()).toContain('legacy_x')
      await w.get('[data-testid="orphan-row"][data-key="legacy_x"] button').trigger('click')
      const form = (w.emitted('update:modelValue') as ProductForm[][]).at(-1)![0]!
      const payload = buildProductPayload(form, { platform: true, featureDefs: defs })
      expect(payload.features!.map((f) => f.feature_key)).toEqual(['crm'])
      expect(validateProductForm(form, { platform: true, featureDefs: defs })).toBeNull()
    })

    it('keeps the validation error while an orphan remains', () => {
      expect(validateProductForm(orphanForm(), { platform: true, featureDefs: defs })).toMatch(
        /legacy_x.*tidak aktif/,
      )
    })

    it('shows no orphan section without orphans', () => {
      expect(mountWith().find('[data-testid="orphan-section"]').exists()).toBe(false)
    })
  })

  it('omits untouched default rows from the payload', async () => {
    const w = mountWith()
    await row(w, 'domain').get('select[name="status"]').setValue('unlimited')
    const form = (w.emitted('update:modelValue') as ProductForm[][]).at(-1)![0]!
    const payload = buildProductPayload(
      { ...form, name: 'P', basePrice: '1' },
      { platform: true, featureDefs: defs },
    )
    expect(payload.features).toEqual([
      { feature_key: 'domain', value: true, display_label: undefined, position: 0 },
    ])
  })

  it('round-trips an existing product unchanged', () => {
    const features = [
      { feature_key: 'crm', value: true, position: 0 },
      { feature_key: 'lead', value: 50, display_label: '50 lead', position: 1 },
      { feature_key: 'domain', value: false, position: 2 },
      { feature_key: 'fee', value: 1.5, position: 3 },
    ]
    const product = {
      id: 'p1',
      name: 'Pro',
      unit: 'pcs',
      base_price: '1',
      tax_percent: '0',
      is_active: true,
      features,
    } as unknown as Parameters<typeof productToForm>[0]
    const form = productToForm(product, defs)
    const w = mountWith(form)
    expect((row(w, 'lead').get('input[name="limit"]').element as HTMLInputElement).value).toBe('50')
    expect(w.emitted('update:modelValue')).toBeUndefined()
    const payload = buildProductPayload(form, { platform: true, featureDefs: defs, editing: true })
    expect(payload.features).toEqual(
      features.map((f) => ({
        feature_key: f.feature_key,
        value: f.value,
        display_label: f.display_label,
        position: f.position,
      })),
    )
  })

  it('blocks adding beyond 30 features with a message', async () => {
    const full: ProductForm = {
      ...emptyProductForm(),
      features: Array.from({ length: 30 }, (_, i) => ({
        key: `old${i}`,
        raw: true,
        displayLabel: '',
      })),
    }
    const w = mountWith(full)
    await row(w, 'crm').get('select[name="status"]').setValue('unlimited')
    expect(w.get('[role="alert"]').text()).toBe('Maksimal 30 fitur per produk.')
    expect(w.emitted('update:modelValue')).toBeUndefined()
    expect(w.get('[data-testid="entitlement-counter"]').text()).toBe('30 / 30 fitur')
  })
})
