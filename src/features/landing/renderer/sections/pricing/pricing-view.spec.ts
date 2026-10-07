import { describe, expect, it } from 'vitest'

import type {
  PublicListing,
  PublicListingCategory,
  PublicListingVariant,
} from '@/features/public/api/public-catalog.api'
import { formatCurrency } from '@/lib/utils'

import {
  buildCards,
  checkoutTarget,
  defaultFrequency,
  frequenciesOf,
  maxYearlySavings,
  yearlySavings,
} from './pricing-view'

function variant(over: Partial<PublicListingVariant>): PublicListingVariant {
  return {
    product_id: 'p1',
    sku: 'SKU-1',
    charge_type: 'recurring',
    billing_frequency: 'monthly',
    payment_timing: 'prepaid',
    currency: 'IDR',
    base_price: '100000',
    tax_percent: '11',
    price_with_tax: '111000',
    checkout_enabled: true,
    ...over,
  }
}

function listing(
  over: Partial<PublicListing> & { variants: PublicListingVariant[] },
): PublicListing {
  return {
    code: 'freelancer',
    name: 'Freelancer',
    order: 1,
    benefits: [{ label: '3 halaman' }],
    ...over,
  }
}

function category(listings: PublicListing[]): PublicListingCategory {
  return { id: 'c1', name: 'Paket', position: 1, listings }
}

describe('frequenciesOf / defaultFrequency', () => {
  it('mengurutkan harian → tahunan tanpa duplikat', () => {
    const cat = category([
      listing({
        variants: [
          variant({ billing_frequency: 'annual' }),
          variant({ billing_frequency: 'monthly' }),
        ],
      }),
      listing({
        code: 'b',
        variants: [
          variant({ billing_frequency: 'daily' }),
          variant({ billing_frequency: 'monthly' }),
        ],
      }),
    ])
    expect(frequenciesOf(cat)).toEqual(['daily', 'monthly', 'annual'])
  })

  it('produk sekali bayar tidak menambah frekuensi', () => {
    const cat = category([
      listing({ variants: [variant({ charge_type: 'one_time', billing_frequency: null })] }),
    ])
    expect(frequenciesOf(cat)).toEqual([])
  })

  it('default: monthly bila ada, selain itu yang pertama, kosong → null', () => {
    expect(defaultFrequency(['daily', 'monthly', 'annual'])).toBe('monthly')
    expect(defaultFrequency(['quarterly', 'annual'])).toBe('quarterly')
    expect(defaultFrequency([])).toBeNull()
  })
})

describe('buildCards', () => {
  it('checkout_enabled → kartu checkout dengan harga + pajak dan akhiran frekuensi', () => {
    const [card] = buildCards(category([listing({ variants: [variant({})] })]), 'monthly')
    expect(card!.cta).toEqual({ kind: 'checkout', productId: 'p1' })
    expect(card!.ctaLabel).toBe('Pilih Freelancer')
    expect(card!.priceLabel).toBe(`${formatCurrency(111000)}/bulan`)
    expect(card!.benefits).toEqual(['3 halaman'])
  })

  it('memilih varian sesuai frekuensi terpilih', () => {
    const cat = category([
      listing({
        variants: [
          variant({ product_id: 'm', billing_frequency: 'monthly' }),
          variant({ product_id: 'y', billing_frequency: 'annual', price_with_tax: '1110000' }),
        ],
      }),
    ])
    expect(buildCards(cat, 'annual')[0]!.cta).toEqual({ kind: 'checkout', productId: 'y' })
    expect(buildCards(cat, 'annual')[0]!.priceLabel).toBe(`${formatCurrency(1110000)}/tahun`)
  })

  it('varian untuk frekuensi tidak ada → unavailable dengan label frekuensi', () => {
    const cat = category([listing({ variants: [variant({ billing_frequency: 'monthly' })] })])
    const [card] = buildCards(cat, 'annual')
    expect(card!.cta).toEqual({ kind: 'unavailable' })
    expect(card!.ctaLabel).toBe('Tidak tersedia Tahunan')
  })

  it('harga 0 → free "Mulai gratis"', () => {
    const cat = category([
      listing({
        variants: [variant({ price_with_tax: '0', base_price: '0', checkout_enabled: false })],
      }),
    ])
    const [card] = buildCards(cat, 'monthly')
    expect(card!.cta).toEqual({ kind: 'free' })
    expect(card!.ctaLabel).toBe('Mulai gratis')
    expect(card!.priceLabel).toBe('Gratis')
  })

  it('tanpa checkout → "Hubungi sales"', () => {
    const cat = category([listing({ variants: [variant({ checkout_enabled: false })] })])
    const [card] = buildCards(cat, 'monthly')
    expect(card!.cta).toEqual({ kind: 'contact' })
    expect(card!.ctaLabel).toBe('Hubungi sales')
  })

  it('produk sekali bayar memakai varian tunggal tanpa frekuensi (tanpa akhiran)', () => {
    const cat = category([
      listing({
        variants: [
          variant({
            charge_type: 'one_time',
            billing_frequency: null,
            checkout_enabled: false,
            price_with_tax: '5550000',
          }),
        ],
      }),
    ])
    const [card] = buildCards(cat, null)
    expect(card!.cta).toEqual({ kind: 'contact' })
    expect(card!.priceLabel).toBe(formatCurrency(5550000))
    // tetap tampil walau kategori punya toggle frekuensi
    expect(buildCards(cat, 'monthly')[0]!.cta).toEqual({ kind: 'contact' })
  })

  it('urut berdasarkan order listing', () => {
    const cat = category([
      listing({ code: 'b', name: 'B', order: 2, variants: [variant({})] }),
      listing({ code: 'a', name: 'A', order: 1, variants: [variant({})] }),
    ])
    expect(buildCards(cat, 'monthly').map((c) => c.code)).toEqual(['a', 'b'])
  })
})

describe('checkoutTarget', () => {
  it('sudah login → langsung ke checkout', () => {
    expect(checkoutTarget('abc', true)).toBe('/app/checkout?product=abc')
  })
  it('belum login → register dengan redirect ter-encode', () => {
    expect(checkoutTarget('abc', false)).toBe(
      '/auth/register?redirect=' + encodeURIComponent('/app/checkout?product=abc'),
    )
  })
})

describe('yearlySavings', () => {
  const l = (m: string | null, y: string | null) =>
    listing({
      variants: [
        ...(m ? [variant({ billing_frequency: 'monthly', price_with_tax: m })] : []),
        ...(y ? [variant({ billing_frequency: 'annual', price_with_tax: y })] : []),
      ],
    })

  it('computes rounded percentage', () => {
    expect(yearlySavings(l('100000', '1000000'))).toBe(17)
  })
  it('null when a variant is missing', () => {
    expect(yearlySavings(l('100000', null))).toBeNull()
    expect(yearlySavings(l(null, '1000000'))).toBeNull()
  })
  it('null when a price is zero', () => {
    expect(yearlySavings(l('0', '0'))).toBeNull()
    expect(yearlySavings(l('100000', '0'))).toBeNull()
    expect(yearlySavings(l('0', '1000000'))).toBeNull()
  })
  it('null when result <= 0', () => {
    expect(yearlySavings(l('100000', '1300000'))).toBeNull()
    expect(yearlySavings(l('100000', '1200000'))).toBeNull()
  })
  it('null for non-numeric prices', () => {
    expect(yearlySavings(l('abc', '1000000'))).toBeNull()
  })
})

describe('maxYearlySavings', () => {
  const cat = (listings: PublicListing[]) =>
    ({ id: 'c', name: 'C', position: 0, listings }) as PublicListingCategory
  const l = (m: string, y: string | null) =>
    listing({
      variants: [
        variant({ billing_frequency: 'monthly', price_with_tax: m }),
        ...(y ? [variant({ billing_frequency: 'annual', price_with_tax: y })] : []),
      ],
    })

  it('takes the largest across listings', () => {
    expect(maxYearlySavings(cat([l('100000', '1000000'), l('100000', '600000')]))).toBe(50)
  })
  it('null when none (monthly-only category or empty)', () => {
    expect(maxYearlySavings(cat([l('100000', null)]))).toBeNull()
    expect(maxYearlySavings(cat([]))).toBeNull()
  })
})
