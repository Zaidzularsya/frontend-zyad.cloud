import { describe, expect, it, vi } from 'vitest'

import type { PublicListingCategory } from '@/features/public/api/public-catalog.api'
import {
  DEFAULT_CATALOG_PRICING_CONFIG,
  serializeCatalogPricingConfig,
} from '../../renderer/catalog-pricing/catalog-pricing-config'
import {
  buildCatalogPricingPreview,
  CATALOG_PRICING_BLOCK_ID,
  CATALOG_PRICING_TYPE,
  registerCatalogPricing,
} from './grapes.catalog-pricing-component'

function variant(freq: string | null, price: string) {
  return {
    product_id: `p-${freq}`,
    sku: 's',
    charge_type: 'recurring',
    billing_frequency: freq,
    payment_timing: 'prepaid',
    currency: 'IDR',
    base_price: price,
    tax_percent: '0',
    price_with_tax: price,
    checkout_enabled: true,
  }
}

const categories: PublicListingCategory[] = [
  {
    id: 'c1',
    name: 'Workspace',
    position: 1,
    listings: [
      {
        code: 'starter',
        name: 'Starter',
        order: 1,
        variants: [variant('monthly', '100000'), variant('annual', '1000000')],
        benefits: [{ label: 'Fitur A' }],
      },
      {
        code: 'pro',
        name: 'Small Business',
        order: 2,
        variants: [variant('monthly', '200000')],
        benefits: [],
      },
    ],
  } as unknown as PublicListingCategory,
]

describe('buildCatalogPricingPreview', () => {
  it('menampilkan nama listing dan badge Populer pada featuredCode', () => {
    const html = buildCatalogPricingPreview(
      { ...DEFAULT_CATALOG_PRICING_CONFIG, featuredCode: 'pro' },
      categories,
    )
    expect(html).toContain('Starter')
    expect(html).toContain('Small Business')
    expect(html).toContain('Populer')
  })

  it('tanpa featuredCode tidak ada badge Populer', () => {
    const html = buildCatalogPricingPreview(DEFAULT_CATALOG_PRICING_CONFIG, categories)
    expect(html).not.toContain('Populer')
  })

  it('listing kosong menampilkan placeholder', () => {
    const html = buildCatalogPricingPreview(DEFAULT_CATALOG_PRICING_CONFIG, [])
    expect(html).toContain('Belum ada produk publik — publikasikan di Sales → Produk')
  })

  it('escape teks config', () => {
    const html = buildCatalogPricingPreview(
      { ...DEFAULT_CATALOG_PRICING_CONFIG, title: '<b>x</b>' },
      categories,
    )
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;')
  })
})

describe('registerCatalogPricing', () => {
  it('mendaftarkan tipe dengan sentinel tanpa anak dan config default', () => {
    const addType = vi.fn()
    registerCatalogPricing({ Components: { addType } } as never, () => categories)
    expect(CATALOG_PRICING_BLOCK_ID).toBe('zy-catalog-pricing')
    expect(addType).toHaveBeenCalledTimes(1)
    const [type, def] = addType.mock.calls[0]!
    expect(type).toBe(CATALOG_PRICING_TYPE)
    const d = def.model.defaults
    expect(d.attributes['data-zyad-slot']).toBe('catalog-pricing')
    expect(d.attributes['data-zyad-config']).toBe(
      serializeCatalogPricingConfig(DEFAULT_CATALOG_PRICING_CONFIG),
    )
    expect(d.droppable).toBe(false)
    expect(d.copyable).toBe(false)
    expect(d.components).toBeUndefined()
    const el = {
      tagName: 'DIV',
      getAttribute: (k: string) => (k === 'data-zyad-slot' ? 'catalog-pricing' : null),
    }
    expect(def.isComponent(el)).toEqual({ type: CATALOG_PRICING_TYPE })
    expect(def.isComponent({ tagName: 'DIV', getAttribute: () => 'pricing-plans' })).toBeUndefined()
  })
})
