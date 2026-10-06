import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import type { CatalogFeatureDef } from '@/features/catalog/api/catalog.api'
import { emptyProductForm, type ProductForm } from '@/features/catalog/utils/product-form'

import ProductPublishingSection from './ProductPublishingSection.vue'

const defs: CatalogFeatureDef[] = [
  { key: 'crm', name: 'CRM', module: 'crm', value_type: 'boolean' },
  { key: 'users', name: 'Jumlah user', module: 'core', value_type: 'integer', unit: 'user' },
  { key: 'support', name: 'Support', module: 'core', value_type: 'string' },
]

function mountWith(form: ProductForm) {
  return mount(ProductPublishingSection, { props: { modelValue: form, defs } })
}

describe('ProductPublishingSection', () => {
  it('disables feature keys already used by another row', () => {
    const w = mountWith({
      ...emptyProductForm(),
      features: [
        { key: 'crm', raw: true, displayLabel: '' },
        { key: 'users', raw: '5', displayLabel: '' },
      ],
    })
    const secondRowOptions = w.findAll('[data-testid="feature-row"]')[1]!.findAll('option')
    const byText = (t: string) => secondRowOptions.find((o) => o.text() === t)!
    expect(byText('CRM').attributes('disabled')).toBeDefined()
    expect(byText('Jumlah user').attributes('disabled')).toBeUndefined()
    expect(byText('Support').attributes('disabled')).toBeUndefined()
  })

  it('renders a checkbox for boolean features and a text input otherwise', () => {
    const w = mountWith({
      ...emptyProductForm(),
      features: [
        { key: 'crm', raw: true, displayLabel: '' },
        { key: 'users', raw: '5', displayLabel: '' },
      ],
    })
    const rows = w.findAll('[data-testid="feature-row"]')
    expect(rows[0]!.find('input[name="feature_value"]').attributes('type')).toBe('checkbox')
    expect(rows[1]!.find('input[name="feature_value"]').attributes('type')).toBeUndefined()
  })

  it('removes a row through the delete button', async () => {
    const w = mountWith({
      ...emptyProductForm(),
      features: [
        { key: 'crm', raw: true, displayLabel: '' },
        { key: 'users', raw: '5', displayLabel: '' },
      ],
    })
    await w.findAll('button[aria-label="Hapus fitur"]')[0]!.trigger('click')
    const emitted = w.emitted('update:modelValue')!.at(-1)![0] as ProductForm
    expect(emitted.features.map((r) => r.key)).toEqual(['users'])
  })

  it('adds the first unused feature', async () => {
    const w = mountWith({
      ...emptyProductForm(),
      features: [{ key: 'crm', raw: true, displayLabel: '' }],
    })
    await w
      .findAll('button')
      .find((b) => b.text().includes('Tambah fitur'))!
      .trigger('click')
    const emitted = w.emitted('update:modelValue')!.at(-1)![0] as ProductForm
    expect(emitted.features.map((r) => r.key)).toEqual(['crm', 'users'])
  })

  it('stops adding at 30 rows', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      key: `k${i}`,
      raw: true as string | boolean,
      displayLabel: '',
    }))
    const w = mountWith({ ...emptyProductForm(), features: many })
    const add = w.findAll('button').find((b) => b.text().includes('Tambah fitur'))!
    expect(add.attributes('disabled')).toBeDefined()
  })

  it('shows the listing conflict error under the listing code', () => {
    const w = mount(ProductPublishingSection, {
      props: { modelValue: emptyProductForm(), defs, listingError: 'Kode listing sudah dipakai.' },
    })
    expect(w.text()).toContain('Kode listing sudah dipakai.')
  })
})
