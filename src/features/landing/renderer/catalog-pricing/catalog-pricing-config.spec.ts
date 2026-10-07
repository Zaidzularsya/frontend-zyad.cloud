import { describe, expect, it } from 'vitest'

import {
  DEFAULT_CATALOG_PRICING_CONFIG as D,
  parseCatalogPricingConfig,
  serializeCatalogPricingConfig,
} from './catalog-pricing-config'

const parse = (o: unknown) => parseCatalogPricingConfig(JSON.stringify(o))

describe('parseCatalogPricingConfig', () => {
  it('returns defaults for null / undefined / empty / invalid json', () => {
    expect(parseCatalogPricingConfig(null)).toEqual(D)
    expect(parseCatalogPricingConfig(undefined)).toEqual(D)
    expect(parseCatalogPricingConfig('')).toEqual(D)
    expect(parseCatalogPricingConfig('{bad')).toEqual(D)
  })

  it('has the exact default values', () => {
    expect(D).toEqual({
      title: 'Pilih paket sesuai tahap bisnis Anda',
      subtitle: 'Mulai gratis, bayar saat Anda siap berkembang.',
      categoryIds: [],
      defaultFrequency: 'monthly',
      featuredCode: null,
      showYearlySavings: true,
      enterpriseCard: {
        enabled: true,
        title: 'Enterprise / Business',
        points: [
          'Workflow disesuaikan proses bisnis Anda',
          'Onboarding & migrasi data didampingi',
          'Multi-workspace & hak akses lanjutan',
          'Support prioritas',
        ],
      },
      contactHref: '#konsultasi',
    })
  })

  it('returns defaults for JSON that is not an object', () => {
    expect(parseCatalogPricingConfig('[]')).toEqual(D)
    expect(parseCatalogPricingConfig('123')).toEqual(D)
    expect(parseCatalogPricingConfig('"x"')).toEqual(D)
    expect(parseCatalogPricingConfig('null')).toEqual(D)
  })

  it('falls back per field', () => {
    const c = parse({
      title: 'x'.repeat(121),
      defaultFrequency: 'weekly',
      contactHref: 'javascript:alert(1)',
      enterpriseCard: { enabled: false, points: Array(7).fill('a') },
      featuredCode: 'freelancer',
    })
    expect(c.title).toBe(D.title)
    expect(c.defaultFrequency).toBe('monthly')
    expect(c.contactHref).toBe('#konsultasi')
    expect(c.enterpriseCard.enabled).toBe(false)
    expect(c.enterpriseCard.points).toEqual(D.enterpriseCard.points)
    expect(c.featuredCode).toBe('freelancer')
  })

  it('accepts values exactly at the limits', () => {
    const points = Array(6).fill('p'.repeat(120))
    const c = parse({
      title: 't'.repeat(120),
      subtitle: 's'.repeat(240),
      enterpriseCard: { enabled: true, title: 'e'.repeat(120), points },
    })
    expect(c.title).toHaveLength(120)
    expect(c.subtitle).toHaveLength(240)
    expect(c.enterpriseCard.points).toEqual(points)
    expect(c.enterpriseCard.title).toHaveLength(120)
  })

  it('rejects values just over the limits', () => {
    const c = parse({
      subtitle: 's'.repeat(241),
      enterpriseCard: { title: 'e'.repeat(121), points: ['ok', 'p'.repeat(121)] },
    })
    expect(c.subtitle).toBe(D.subtitle)
    expect(c.enterpriseCard.title).toBe(D.enterpriseCard.title)
    expect(c.enterpriseCard.points).toEqual(D.enterpriseCard.points)
  })

  it('rejects non-string items in points', () => {
    expect(parse({ enterpriseCard: { points: ['a', 1] } }).enterpriseCard.points).toEqual(
      D.enterpriseCard.points,
    )
  })

  it('contactHref: only safe, non-"#" values pass', () => {
    expect(parse({ contactHref: '#' }).contactHref).toBe('#konsultasi')
    expect(parse({ contactHref: '//evil.com' }).contactHref).toBe('#konsultasi')
    expect(parse({ contactHref: '' }).contactHref).toBe('#konsultasi')
    expect(parse({ contactHref: 42 }).contactHref).toBe('#konsultasi')
    expect(parse({ contactHref: '#kontak' }).contactHref).toBe('#kontak')
    expect(parse({ contactHref: '/hubungi' }).contactHref).toBe('/hubungi')
    expect(parse({ contactHref: 'https://example.com/x' }).contactHref).toBe(
      'https://example.com/x',
    )
  })

  it('categoryIds: non-array or non-string items → []', () => {
    expect(parse({ categoryIds: 'c1' }).categoryIds).toEqual([])
    expect(parse({ categoryIds: { a: 1 } }).categoryIds).toEqual([])
    expect(parse({ categoryIds: ['c1', 2] }).categoryIds).toEqual([])
    expect(parse({ categoryIds: ['c1', 'c2'] }).categoryIds).toEqual(['c1', 'c2'])
  })

  it('featuredCode: non-string → null', () => {
    expect(parse({ featuredCode: 5 }).featuredCode).toBeNull()
    expect(parse({ featuredCode: {} }).featuredCode).toBeNull()
    expect(parse({ featuredCode: null }).featuredCode).toBeNull()
  })

  it('enterpriseCard non-object → default', () => {
    expect(parse({ enterpriseCard: 'x' }).enterpriseCard).toEqual(D.enterpriseCard)
    expect(parse({ enterpriseCard: [] }).enterpriseCard).toEqual(D.enterpriseCard)
    expect(parse({ enterpriseCard: null }).enterpriseCard).toEqual(D.enterpriseCard)
  })

  it('boolean fields with wrong type → default', () => {
    expect(parse({ showYearlySavings: 'no' }).showYearlySavings).toBe(true)
    expect(parse({ showYearlySavings: false }).showYearlySavings).toBe(false)
    expect(parse({ enterpriseCard: { enabled: 0 } }).enterpriseCard.enabled).toBe(true)
  })

  it('defaultFrequency accepts yearly', () => {
    expect(parse({ defaultFrequency: 'yearly' }).defaultFrequency).toBe('yearly')
  })

  it('returns fresh arrays (defaults not shared/mutable)', () => {
    const a = parseCatalogPricingConfig(null)
    a.categoryIds.push('x')
    a.enterpriseCard.points.push('y')
    expect(D.categoryIds).toEqual([])
    expect(D.enterpriseCard.points).toHaveLength(4)
  })
})

describe('serializeCatalogPricingConfig', () => {
  it('round-trips', () => {
    const c = { ...D, categoryIds: ['c1'] }
    expect(parseCatalogPricingConfig(serializeCatalogPricingConfig(c))).toEqual(c)
  })
})
