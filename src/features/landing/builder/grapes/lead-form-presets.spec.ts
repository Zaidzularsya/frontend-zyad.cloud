import { describe, expect, it } from 'vitest'

import { nextFormKey, STANDARD_LEAD_FORM } from './lead-form-presets'

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

describe('STANDARD_LEAD_FORM', () => {
  it('form: nilai persis Global Constraints', () => {
    expect(STANDARD_LEAD_FORM.form).toEqual({
      name: 'Form Konsultasi',
      key: 'konsultasi',
      is_active: true,
      submit_label: 'Kirim',
      success_message: 'Terima kasih! Tim kami akan menghubungi Anda dalam 1 hari kerja.',
    })
  })

  it('berisi 8 field dengan key/tipe/label/wajib persis dan sort_order berurutan', () => {
    expect(
      STANDARD_LEAD_FORM.fields.map((f) => [f.key, f.type, f.label, f.required, f.sort_order]),
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
    expect(STANDARD_LEAD_FORM.fields[4]!.options).toEqual([
      '1–10',
      '11–50',
      '51–200',
      '201–1000',
      '>1000',
    ])
  })

  it('key field lolos aturan backend (huruf kecil, angka, underscore)', () => {
    for (const f of STANDARD_LEAD_FORM.fields) expect(f.key).toMatch(/^[a-z0-9_]+$/)
  })
})
