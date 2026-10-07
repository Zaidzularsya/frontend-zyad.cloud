import type { CreateFormPayload, FormFieldItem } from '../../shared/types/landing.types'

/**
 * Preset "Form standar" untuk blok Form Konsultasi. Key field mengikuti
 * konvensi backend (name/email/phone/company/consent dipakai sink CRM dan
 * tidak dimasukkan ke catatan lead).
 */

export const STANDARD_FORM_BASE_KEY = 'konsultasi'

function field(
  sortOrder: number,
  key: string,
  type: string,
  label: string,
  required = false,
  options: string[] = [],
): FormFieldItem {
  return {
    key,
    type,
    label,
    placeholder: '',
    options,
    validation: {},
    required,
    sort_order: sortOrder,
  }
}

export const STANDARD_LEAD_FORM: { form: CreateFormPayload; fields: FormFieldItem[] } = {
  form: {
    name: 'Form Konsultasi',
    key: STANDARD_FORM_BASE_KEY,
    is_active: true,
    submit_label: 'Kirim',
    success_message: 'Terima kasih! Tim kami akan menghubungi Anda dalam 1 hari kerja.',
  },
  fields: [
    field(0, 'name', 'text', 'Nama lengkap', true),
    field(1, 'email', 'email', 'Email kerja', true),
    field(2, 'phone', 'phone', 'No. WhatsApp', true),
    field(3, 'company', 'text', 'Perusahaan'),
    field(4, 'company_size', 'select', 'Jumlah karyawan', false, [
      '1–10',
      '11–50',
      '51–200',
      '201–1000',
      '>1000',
    ]),
    field(5, 'interest', 'text', 'Minat'),
    field(6, 'message', 'textarea', 'Pesan'),
    field(
      7,
      'consent',
      'checkbox',
      'Saya setuju data saya diproses untuk keperluan konsultasi sesuai Kebijakan Privasi',
      true,
    ),
  ],
}

/** 'konsultasi' bila bebas; selain itu 'konsultasi-2', 'konsultasi-3', … (key unik per halaman, case-insensitive). */
export function nextFormKey(existingKeys: string[], base: string = STANDARD_FORM_BASE_KEY): string {
  const used = new Set(existingKeys.map((k) => k.toLowerCase()))
  if (!used.has(base)) return base
  let n = 2
  while (used.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}
