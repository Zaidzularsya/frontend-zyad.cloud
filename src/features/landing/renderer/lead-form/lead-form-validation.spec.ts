import { describe, expect, it } from 'vitest'

import type { GrapesChromeFormField } from '../grapes/chrome'
import { CONSENT_ERROR, validateLeadForm } from './lead-form-validation'

function field(over: Partial<GrapesChromeFormField>): GrapesChromeFormField {
  return {
    key: 'f',
    type: 'text',
    label: 'F',
    placeholder: '',
    options: [],
    required: false,
    ...over,
  }
}

describe('validateLeadForm', () => {
  it('flags empty required fields', () => {
    const errs = validateLeadForm([field({ key: 'name', required: true })], { name: '   ' })
    expect(errs).toEqual({ name: 'Wajib diisi.' })
  })

  it('skips optional empty fields', () => {
    expect(validateLeadForm([field({ key: 'company' })], {})).toEqual({})
  })

  it('validates email format', () => {
    const f = [field({ key: 'email', type: 'email', required: true })]
    expect(validateLeadForm(f, { email: 'a@b' })).toEqual({ email: 'Format email tidak valid.' })
    expect(validateLeadForm(f, { email: 'a@b.co' })).toEqual({})
  })

  it('validates phone: 8-15 digits, optional leading +', () => {
    const f = [field({ key: 'phone', type: 'phone', required: true })]
    // '0812-3456' is exactly 8 digits, so it is on the valid boundary of the 8-15 rule.
    expect(validateLeadForm(f, { phone: '0812-3456' })).toEqual({})
    expect(validateLeadForm(f, { phone: '0812-345' })).toEqual({ phone: 'Nomor tidak valid.' })
    expect(validateLeadForm(f, { phone: '+62 812 3456 7890' })).toEqual({})
    expect(validateLeadForm(f, { phone: '0812-3456-7890' })).toEqual({})
    expect(validateLeadForm(f, { phone: '1234567890123456' })).toEqual({
      phone: 'Nomor tidak valid.',
    })
    expect(validateLeadForm(f, { phone: '08123abc456' })).toEqual({ phone: 'Nomor tidak valid.' })
  })

  it('requires consent only when a consent field exists', () => {
    const withConsent = [field({ key: 'consent', type: 'checkbox', required: true })]
    expect(validateLeadForm(withConsent, { consent: false })).toEqual({ consent: CONSENT_ERROR })
    expect(validateLeadForm(withConsent, { consent: true })).toEqual({})
    expect(validateLeadForm([field({ key: 'name' })], {})).toEqual({})
    expect(CONSENT_ERROR).toBe('Mohon setujui pemrosesan data untuk melanjutkan.')
  })

  it('rejects a select value outside the options', () => {
    const f = [field({ key: 'size', type: 'select', options: ['1–10', '11–50'], required: true })]
    expect(validateLeadForm(f, { size: '999' })).toEqual({ size: 'Pilihan tidak valid.' })
    expect(validateLeadForm(f, { size: '11–50' })).toEqual({})
  })

  it('does not validate hidden fields', () => {
    const f = [field({ key: 'utm', type: 'hidden', required: true })]
    expect(validateLeadForm(f, {})).toEqual({})
  })
})
