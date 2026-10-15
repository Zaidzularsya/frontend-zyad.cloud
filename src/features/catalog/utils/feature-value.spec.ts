import { describe, expect, it } from 'vitest'

import type { CatalogFeatureDef } from '@/features/catalog/api/catalog.api'

import { featureInputText, parseFeatureInput } from './feature-value'

const def = (value_type: CatalogFeatureDef['value_type']): CatalogFeatureDef => ({
  key: 'k',
  name: 'K',
  module: 'm',
  value_type,
})

describe('parseFeatureInput', () => {
  it('parses integers and rejects fractions', () => {
    expect(parseFeatureInput(def('integer'), '5')).toEqual({ ok: true, value: 5 })
    expect(parseFeatureInput(def('integer'), '5,5')).toEqual({
      ok: false,
      error: 'Harus bilangan bulat',
    })
  })

  it('accepts the Indonesian decimal comma', () => {
    expect(parseFeatureInput(def('decimal'), '2,5')).toEqual({ ok: true, value: 2.5 })
    expect(parseFeatureInput(def('decimal'), 'abc').ok).toBe(false)
  })

  it('passes booleans through as real booleans', () => {
    expect(parseFeatureInput(def('boolean'), true)).toEqual({ ok: true, value: true })
    expect(parseFeatureInput(def('boolean'), false)).toEqual({ ok: true, value: false })
  })

  it('rejects empty and over-long strings', () => {
    expect(parseFeatureInput(def('string'), '  ')).toEqual({
      ok: false,
      error: 'Nilai wajib diisi',
    })
    expect(parseFeatureInput(def('string'), 'x'.repeat(201)).ok).toBe(false)
    expect(parseFeatureInput(def('string'), ' Prioritas ')).toEqual({
      ok: true,
      value: 'Prioritas',
    })
  })
})

describe('featureInputText', () => {
  it('formats stored values back into inputs', () => {
    expect(featureInputText(def('boolean'), true)).toBe(true)
    expect(featureInputText(def('integer'), 5)).toBe('5')
    expect(featureInputText(def('string'), null)).toBe('')
  })
})
