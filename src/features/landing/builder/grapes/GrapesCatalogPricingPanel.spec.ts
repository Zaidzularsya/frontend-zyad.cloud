import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import type { PublicListingCategory } from '@/features/public/api/public-catalog.api'
import { parseCatalogPricingConfig } from '../../renderer/catalog-pricing/catalog-pricing-config'
import GrapesCatalogPricingPanel from './GrapesCatalogPricingPanel.vue'

const categories = [
  {
    id: 'c1',
    name: 'Workspace',
    position: 1,
    listings: [
      { code: 'starter', name: 'Starter', order: 1, variants: [], benefits: [] },
      { code: 'pro', name: 'Small Business', order: 2, variants: [], benefits: [] },
    ],
  },
] as unknown as PublicListingCategory[]

function setup(attrs: Record<string, string> = {}) {
  const addAttributes = vi.fn()
  const component = { getAttributes: () => attrs, addAttributes }
  const wrapper = mount(GrapesCatalogPricingPanel, { props: { component, categories } })
  const last = () => {
    const call = addAttributes.mock.calls.at(-1)![0] as Record<string, string>
    return parseCatalogPricingConfig(call['data-zyad-config'])
  }
  return { wrapper, addAttributes, last }
}

describe('GrapesCatalogPricingPanel', () => {
  it('ubah judul memanggil addAttributes dengan JSON berisi judul baru', async () => {
    const { wrapper, addAttributes, last } = setup()
    await wrapper.get('input[aria-label="Judul"]').setValue('Judul baru')
    expect(addAttributes).toHaveBeenCalled()
    expect(last().title).toBe('Judul baru')
  })

  it('menampilkan catatan sumber data', () => {
    expect(setup().wrapper.text()).toContain('Harga dan fitur diambil dari Sales → Produk.')
  })

  it('judul kosong atau terlalu panjang tidak disimpan dan menampilkan error', async () => {
    const { wrapper, addAttributes } = setup()
    await wrapper.get('input[aria-label="Judul"]').setValue('x'.repeat(121))
    expect(addAttributes).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('maksimal 120')
  })

  it('frekuensi awal memakai nilai monthly/annual', async () => {
    const { wrapper, last } = setup()
    await wrapper.get('input[type="radio"][value="annual"]').setValue(true)
    expect(last().defaultFrequency).toBe('annual')
  })

  it('memilih kategori dan kartu unggulan', async () => {
    const { wrapper, last } = setup()
    await wrapper.get('input[type="checkbox"][value="c1"]').setValue(true)
    expect(last().categoryIds).toEqual(['c1'])
    await wrapper.get('select[aria-label="Kartu unggulan"]').setValue('pro')
    expect(last().featuredCode).toBe('pro')
    await wrapper.get('select[aria-label="Kartu unggulan"]').setValue('')
    expect(last().featuredCode).toBeNull()
  })

  it('poin Enterprise per baris; lebih dari 6 ditolak', async () => {
    const { wrapper, addAttributes, last } = setup()
    const ta = wrapper.get('textarea[aria-label="Poin Enterprise"]')
    await ta.setValue('A\nB\n\nC')
    expect(last().enterpriseCard.points).toEqual(['A', 'B', 'C'])
    addAttributes.mockClear()
    await ta.setValue('1\n2\n3\n4\n5\n6\n7')
    expect(addAttributes).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('maksimal 6')
  })

  it('tujuan Hubungi sales: javascript: ditolak', async () => {
    const { wrapper, addAttributes, last } = setup()
    const input = wrapper.get('input[aria-label="Tujuan Hubungi sales"]')
    await input.setValue('javascript:alert(1)')
    expect(addAttributes).not.toHaveBeenCalled()
    await input.setValue('#kontak')
    expect(last().contactHref).toBe('#kontak')
  })

  it('toggle hemat tahunan dan kartu Enterprise', async () => {
    const { wrapper, last } = setup()
    await wrapper.get('input[aria-label="Tampilkan badge hemat tahunan"]').setValue(false)
    expect(last().showYearlySavings).toBe(false)
    await wrapper.get('input[aria-label="Tampilkan kartu Enterprise"]').setValue(false)
    expect(last().enterpriseCard.enabled).toBe(false)
  })
})
