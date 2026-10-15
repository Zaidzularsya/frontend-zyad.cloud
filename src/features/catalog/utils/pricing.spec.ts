import { describe, expect, it } from 'vitest'

import { DEFAULT_PRICING, normalizePricing, priceSuffix, pricingShort } from './pricing'

describe('pricing', () => {
  it('labels and suffixes', () => {
    expect(pricingShort(DEFAULT_PRICING)).toBe('Sekali bayar · Prabayar')
    const m = {
      charge_type: 'recurring',
      billing_frequency: 'monthly',
      payment_timing: 'postpaid',
    } as const
    expect(pricingShort(m)).toBe('Bulanan · Pascabayar')
    expect(priceSuffix(m)).toBe('/bulan')
    expect(priceSuffix(DEFAULT_PRICING)).toBe('')
  })

  it('normalizes', () => {
    expect(
      normalizePricing({ charge_type: 'one_time', billing_frequency: 'annual' }).billing_frequency,
    ).toBeNull()
    expect(normalizePricing({ charge_type: 'recurring' }).billing_frequency).toBe('monthly')
    expect(normalizePricing({})).toEqual(DEFAULT_PRICING)
  })
})
