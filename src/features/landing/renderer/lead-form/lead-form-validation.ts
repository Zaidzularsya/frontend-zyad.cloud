import type { GrapesChromeFormField } from '../grapes/chrome'

export type LeadFormErrors = Record<string, string>

export const CONSENT_ERROR = 'Mohon setujui pemrosesan data untuk melanjutkan.'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isPhone(value: string): boolean {
  const compact = value.replace(/[\s-]/g, '')
  return /^\+?\d{8,15}$/.test(compact)
}

function isEmpty(type: string, value: unknown): boolean {
  if (type === 'checkbox') return value !== true
  return value === undefined || value === null || String(value).trim() === ''
}

/** Pure client-side validation; returns `{ [fieldKey]: message }`, empty when valid. */
export function validateLeadForm(
  fields: GrapesChromeFormField[],
  values: Record<string, unknown>,
): LeadFormErrors {
  const errors: LeadFormErrors = {}
  for (const f of fields) {
    if (f.type === 'hidden') continue
    const value = values[f.key]

    if (f.key === 'consent' && f.type === 'checkbox') {
      // Consent is only enforced when the form actually has a consent field.
      if (value !== true) errors[f.key] = CONSENT_ERROR
      continue
    }

    if (isEmpty(f.type, value)) {
      if (f.required) errors[f.key] = 'Wajib diisi.'
      continue
    }

    const text = String(value).trim()
    if (f.type === 'email' && !EMAIL_RE.test(text)) {
      errors[f.key] = 'Format email tidak valid.'
    } else if (f.type === 'phone' && !isPhone(text)) {
      errors[f.key] = 'Nomor tidak valid.'
    } else if (
      (f.type === 'select' || f.type === 'radio') &&
      f.options.length > 0 &&
      !f.options.includes(text)
    ) {
      errors[f.key] = 'Pilihan tidak valid.'
    }
  }
  return errors
}
