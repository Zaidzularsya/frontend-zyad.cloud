import type { CreateFormPayload, FormFieldItem } from '../../shared/types/landing.types'

/**
 * Preset form untuk blok Form Konsultasi (Ringkas / Standar / Lengkap). Semua preset membuat
 * 8 baris field yang sama; yang berbeda hanya status 4 field yang bisa diatur, sehingga
 * pindah preset tidak kehilangan label atau opsi yang sudah diubah penulis.
 *
 * Key field mengikuti konvensi backend (name/email/phone/company/consent dipakai sink CRM dan
 * tidak dimasukkan ke catatan lead).
 */

export const STANDARD_FORM_BASE_KEY = 'konsultasi'

export type LeadFormPreset = 'ringkas' | 'standar' | 'lengkap'
export type ConfigurableKey = 'company' | 'company_size' | 'interest' | 'message'
export type FieldStatus = 'locked' | 'show' | 'required' | 'hidden'

/** Wajib, tampil, dan terkunci pada form yang meneruskan ke CRM (aturan server: LANDING_FORM_CORE_FIELDS). */
export const CORE_FIELD_KEYS = ['name', 'email', 'phone'] as const
export const CONFIGURABLE_KEYS: readonly ConfigurableKey[] = [
  'company',
  'company_size',
  'interest',
  'message',
]
const CONSENT_KEY = 'consent'

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
    default_value: '',
  }
}

export const BASE_LEAD_FORM_FIELDS: FormFieldItem[] = [
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
    CONSENT_KEY,
    'checkbox',
    'Saya setuju data saya diproses untuk keperluan konsultasi sesuai Kebijakan Privasi',
    true,
  ),
]

export const LEAD_FORM_BASE: CreateFormPayload = {
  name: 'Form Konsultasi',
  key: STANDARD_FORM_BASE_KEY,
  is_active: true,
  submit_label: 'Kirim',
  success_message: 'Terima kasih! Tim kami akan menghubungi Anda dalam 1 hari kerja.',
  after_submit: 'message',
}

export const LEAD_FORM_PRESETS: Record<
  LeadFormPreset,
  Record<ConfigurableKey, 'show' | 'hidden'>
> = {
  ringkas: { company: 'hidden', company_size: 'hidden', interest: 'hidden', message: 'hidden' },
  standar: { company: 'show', company_size: 'hidden', interest: 'hidden', message: 'show' },
  lengkap: { company: 'show', company_size: 'show', interest: 'show', message: 'show' },
}

const isConfigurable = (key: string): key is ConfigurableKey =>
  (CONFIGURABLE_KEYS as readonly string[]).includes(key)

const isLocked = (key: string): boolean =>
  (CORE_FIELD_KEYS as readonly string[]).includes(key) || key === CONSENT_KEY

function originalType(field: FormFieldItem): string | undefined {
  const t = field.validation?.original_type
  return typeof t === 'string' && t ? t : undefined
}

export function fieldStatus(field: FormFieldItem): FieldStatus {
  if (isLocked(field.key)) return 'locked'
  if (field.type === 'hidden') return 'hidden'
  return field.required ? 'required' : 'show'
}

/**
 * Menerapkan status ke satu field. Sembunyi menyimpan tipe asli di `validation.original_type`
 * (supaya `select` dan opsinya kembali utuh saat ditampilkan lagi) dan mengosongkan `required`.
 */
export function withStatus(
  field: FormFieldItem,
  status: 'show' | 'required' | 'hidden',
): FormFieldItem {
  const validation = { ...(field.validation ?? {}) }
  if (status === 'hidden') {
    if (field.type !== 'hidden') validation.original_type = field.type
    return { ...field, type: 'hidden', required: false, validation }
  }
  const base = BASE_LEAD_FORM_FIELDS.find((f) => f.key === field.key)
  const type = field.type === 'hidden' ? (originalType(field) ?? base?.type ?? 'text') : field.type
  delete validation.original_type
  return { ...field, type, required: status === 'required', validation }
}

function renumber(fields: FormFieldItem[]): FormFieldItem[] {
  return fields.map((f, i) => ({ ...f, sort_order: i }))
}

/** 8 field untuk preset; label/placeholder/opsi/default dari `current` (per key) dipertahankan. */
export function presetFields(preset: LeadFormPreset, current?: FormFieldItem[]): FormFieldItem[] {
  const currentByKey = new Map((current ?? []).map((f) => [f.key, f]))
  const ordered = BASE_LEAD_FORM_FIELDS.map((base) => {
    const existing = currentByKey.get(base.key)
    return {
      ...(existing ?? base),
      sort_order: existing?.sort_order ?? base.sort_order,
    }
  }).sort((a, b) => a.sort_order - b.sort_order)

  const applied = ordered.map((f) => {
    const item = { ...f }
    delete item.id
    return isConfigurable(f.key) ? withStatus(item, LEAD_FORM_PRESETS[preset][f.key]) : item
  })
  return renumber(withConsentLast(applied))
}

function withConsentLast(fields: FormFieldItem[]): FormFieldItem[] {
  return [
    ...fields.filter((f) => f.key !== CONSENT_KEY),
    ...fields.filter((f) => f.key === CONSENT_KEY),
  ]
}

/** Geser satu posisi; consent tetap terakhir dan tidak bisa digeser. sort_order dinomori ulang 0..n-1. */
export function moveField(fields: FormFieldItem[], key: string, dir: -1 | 1): FormFieldItem[] {
  const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order)
  const from = sorted.findIndex((f) => f.key === key)
  const to = from + dir
  const lastMovable = sorted.findIndex((f) => f.key === CONSENT_KEY) - 1
  const limit = lastMovable >= 0 ? lastMovable : sorted.length - 1
  if (key === CONSENT_KEY || from < 0 || to < 0 || to > limit) return renumber(sorted)
  const [item] = sorted.splice(from, 1)
  sorted.splice(to, 0, item!)
  return renumber(withConsentLast(sorted))
}

/** 'konsultasi' bila bebas; selain itu 'konsultasi-2', 'konsultasi-3', … (key unik per halaman, case-insensitive). */
export function nextFormKey(existingKeys: string[], base: string = STANDARD_FORM_BASE_KEY): string {
  const used = new Set(existingKeys.map((k) => k.toLowerCase()))
  if (!used.has(base)) return base
  let n = 2
  while (used.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}
