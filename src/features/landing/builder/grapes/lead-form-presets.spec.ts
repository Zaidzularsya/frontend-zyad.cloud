import { describe, expect, it } from 'vitest'

import {
  BASE_LEAD_FORM_FIELDS,
  CONFIGURABLE_KEYS,
  fieldStatus,
  LEAD_FORM_BASE,
  moveField,
  nextFormKey,
  presetFields,
  withStatus,
  type ConfigurableKey,
  type LeadFormPreset,
} from './lead-form-presets'

const statusByKey = (preset: LeadFormPreset) =>
  Object.fromEntries(presetFields(preset).map((f) => [f.key, fieldStatus(f)]))

describe('nextFormKey', () => {
  it('memakai konsultasi bila belum dipakai', () => {
    expect(nextFormKey([])).toBe('konsultasi')
    expect(nextFormKey(['lain'])).toBe('konsultasi')
  })
  it('memberi akhiran -2, -3, … bila bentrok (case-insensitive)', () => {
    expect(nextFormKey(['konsultasi'])).toBe('konsultasi-2')
    expect(nextFormKey(['konsultasi', 'Konsultasi-2'])).toBe('konsultasi-3')
    expect(nextFormKey(['konsultasi-2'])).toBe('konsultasi')
  })
})

describe('LEAD_FORM_BASE & BASE_LEAD_FORM_FIELDS', () => {
  it('form: nilai persis', () => {
    expect(LEAD_FORM_BASE).toEqual({
      name: 'Form Konsultasi',
      key: 'konsultasi',
      is_active: true,
      submit_label: 'Kirim',
      success_message: 'Terima kasih! Tim kami akan menghubungi Anda dalam 1 hari kerja.',
      after_submit: 'message',
    })
  })

  it('8 field dengan key/tipe/label/wajib persis dan sort_order berurutan', () => {
    expect(
      BASE_LEAD_FORM_FIELDS.map((f) => [f.key, f.type, f.label, f.required, f.sort_order]),
    ).toEqual([
      ['name', 'text', 'Nama lengkap', true, 0],
      ['email', 'email', 'Email kerja', true, 1],
      ['phone', 'phone', 'No. WhatsApp', true, 2],
      ['company', 'text', 'Perusahaan', false, 3],
      ['company_size', 'select', 'Jumlah karyawan', false, 4],
      ['interest', 'text', 'Minat', false, 5],
      ['message', 'textarea', 'Pesan', false, 6],
      [
        'consent',
        'checkbox',
        'Saya setuju data saya diproses untuk keperluan konsultasi sesuai Kebijakan Privasi',
        true,
        7,
      ],
    ])
  })

  it('key field lolos aturan backend (huruf kecil, angka, underscore)', () => {
    for (const f of BASE_LEAD_FORM_FIELDS) expect(f.key).toMatch(/^[a-z0-9_]+$/)
  })
})

describe('presets', () => {
  it('ringkas hides the four configurable fields and keeps core + consent visible', () => {
    const s = statusByKey('ringkas')
    for (const k of CONFIGURABLE_KEYS) expect(s[k]).toBe('hidden')
    for (const k of ['name', 'email', 'phone', 'consent']) expect(s[k]).toBe('locked')
    const fields = presetFields('ringkas')
    expect(fields.filter((f) => f.type === 'hidden').map((f) => f.key)).toEqual([
      'company',
      'company_size',
      'interest',
      'message',
    ])
    expect(fields.filter((f) => f.required).map((f) => f.key)).toEqual([
      'name',
      'email',
      'phone',
      'consent',
    ])
  })

  it('standar shows company and message only', () => {
    const s = statusByKey('standar')
    expect([s.company, s.message, s.company_size, s.interest]).toEqual([
      'show',
      'show',
      'hidden',
      'hidden',
    ])
  })

  it('lengkap shows all eight', () => {
    const s = statusByKey('lengkap')
    for (const k of CONFIGURABLE_KEYS) expect(s[k]).toBe('show')
    expect(presetFields('lengkap').every((f) => f.type !== 'hidden')).toBe(true)
  })

  it('every preset yields 8 fields with consent last', () => {
    for (const p of ['ringkas', 'standar', 'lengkap'] as const) {
      const fields = presetFields(p)
      expect(fields).toHaveLength(8)
      expect(fields.at(-1)!.key).toBe('consent')
      expect(fields.map((f) => f.sort_order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    }
  })

  it('presetFields keeps edited label, options and default_value of current fields', () => {
    const current = presetFields('lengkap').map((f) =>
      f.key === 'company_size'
        ? { ...f, label: 'Ukuran tim', options: ['1–5', '6–20'], default_value: '6–20' }
        : f,
    )
    const next = presetFields('ringkas', current).find((f) => f.key === 'company_size')!
    expect(next).toMatchObject({
      type: 'hidden',
      label: 'Ukuran tim',
      options: ['1–5', '6–20'],
      default_value: '6–20',
    })
    expect(next.validation).toEqual({ original_type: 'select' })
  })
})

describe('withStatus', () => {
  const size = (): ReturnType<typeof presetFields>[number] =>
    BASE_LEAD_FORM_FIELDS.find((f) => f.key === 'company_size')!

  it('hidden stores original_type and clears required', () => {
    const hidden = withStatus({ ...size(), required: true }, 'hidden')
    expect(hidden).toMatchObject({ type: 'hidden', required: false })
    expect(hidden.validation).toEqual({ original_type: 'select' })
  })

  it('restores original type when shown again', () => {
    const shown = withStatus(withStatus(size(), 'hidden'), 'required')
    expect(shown).toMatchObject({
      type: 'select',
      required: true,
      options: ['1–10', '11–50', '51–200', '201–1000', '>1000'],
    })
    expect(shown.validation).toEqual({})
  })

  it('hidden twice keeps the first original_type', () => {
    const twice = withStatus(withStatus(size(), 'hidden'), 'hidden')
    expect(twice.validation).toEqual({ original_type: 'select' })
  })

  it('falls back to the base type when a hidden field has no original_type', () => {
    const odd = { ...size(), type: 'hidden', validation: {} }
    expect(withStatus(odd, 'show').type).toBe('select')
  })
})

describe('fieldStatus', () => {
  it('returns locked for name/email/phone/consent', () => {
    for (const k of ['name', 'email', 'phone', 'consent']) {
      expect(fieldStatus(BASE_LEAD_FORM_FIELDS.find((f) => f.key === k)!)).toBe('locked')
    }
  })
  it('reflects show/required/hidden for configurable fields', () => {
    const msg = BASE_LEAD_FORM_FIELDS.find((f) => f.key === ('message' as ConfigurableKey))!
    expect(fieldStatus(msg)).toBe('show')
    expect(fieldStatus(withStatus(msg, 'required'))).toBe('required')
    expect(fieldStatus(withStatus(msg, 'hidden'))).toBe('hidden')
  })
})

describe('moveField', () => {
  it('never moves a field below consent and renumbers sort_order', () => {
    const fields = presetFields('lengkap')
    const down = moveField(fields, 'message', 1)
    expect(down.map((f) => f.key)).toEqual(fields.map((f) => f.key))
    expect(moveField(fields, 'consent', -1).at(-1)!.key).toBe('consent')

    const swapped = moveField(fields, 'company', 1)
    expect(swapped.map((f) => f.key).slice(3, 5)).toEqual(['company_size', 'company'])
    expect(swapped.map((f) => f.sort_order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })

  it('does nothing at the top edge', () => {
    const fields = presetFields('lengkap')
    expect(moveField(fields, 'name', -1).map((f) => f.key)).toEqual(fields.map((f) => f.key))
  })
})
