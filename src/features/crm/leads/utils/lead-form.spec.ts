import { describe, expect, it } from 'vitest'

import { compactAddress, isValidAnnualRevenue } from './lead-form'

describe('isValidAnnualRevenue', () => {
  it.each(['', '  ', '5000', '5000.5', '5000.55', '0'])('accepts %j', (value) => {
    expect(isValidAnnualRevenue(value)).toBe(true)
  })

  it.each(['-1', '5000.555', '1e6', '5.000.000', '5,000', '12345678901234567'])(
    'rejects %j',
    (value) => {
      expect(isValidAnnualRevenue(value)).toBe(false)
    },
  )
})

describe('compactAddress', () => {
  it('trims values and drops empty fields', () => {
    expect(compactAddress({ street: ' Jl. Merdeka 1 ', city: '', country: '  ' })).toEqual({
      street: 'Jl. Merdeka 1',
    })
  })
})
