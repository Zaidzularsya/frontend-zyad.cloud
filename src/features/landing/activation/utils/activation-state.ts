import type {
  ActivationState,
  LandingPage,
  LandingPageOpenActivation,
} from '@/features/landing/shared/types/landing.types'

export type DurationUnit = 'day' | 'week' | 'month'
export type DueUnit = 'hour' | 'day'

export interface ActivationFormState {
  buyer_name: string
  buyer_contact: string
  buyer_email: string
  /** Desimal sebagai string (mis. "150000" atau "150000.50"); tidak pernah number. */
  price: string
  duration_value: number
  duration_unit: DurationUnit
  due_value: number
  due_unit: DueUnit
}

export interface ActivationInvoicePayload {
  buyer_name: string
  buyer_contact: string
  buyer_email?: string
  price: string
  duration_value: number
  duration_unit: DurationUnit
  invoice_due_hours?: number
  invoice_due_days?: number
}

export interface ActivationResult {
  activation: { id: string; invoice_due_at: string }
  preview_url: string
  payment_url: string
}

export type ActivationFormErrors = Partial<Record<keyof ActivationFormState, string>>

// Batas sama dengan backend (task 13): day <= 730, week <= 104, month <= 24; jam 1-720, hari 1-30.
const MAX_DURATION: Record<DurationUnit, number> = { day: 730, week: 104, month: 24 }
const MAX_DUE: Record<DueUnit, number> = { hour: 720, day: 30 }
const PRICE_PATTERN = /^[0-9]{1,16}(\.[0-9]{1,2})?$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const durationUnitLabel: Record<DurationUnit, string> = {
  day: 'hari',
  week: 'minggu',
  month: 'bulan',
}
export const dueUnitLabel: Record<DueUnit, string> = { hour: 'jam', day: 'hari' }

// DB menyimpan UTC; tampilan selalu WIB (konvensi repo, lihat EntityHistory).
const wibFormat = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Asia/Jakarta',
})

export function formatWib(value: string): string {
  const parts = Object.fromEntries(
    wibFormat.formatToParts(new Date(value)).map((p) => [p.type, p.value]),
  )
  return `${parts.day} ${parts.month} ${parts.year} ${parts.hour}.${parts.minute} WIB`
}

export interface ActivationBadge {
  kind: Exclude<ActivationState, 'none'>
  label: string
}

export function activationBadge(page: {
  activation_state?: ActivationState
  active_until?: string | null
  open_activation?: LandingPageOpenActivation | null
}): ActivationBadge | null {
  switch (page.activation_state) {
    case 'preview': {
      const due = page.open_activation?.invoice_due_at
      return {
        kind: 'preview',
        label: due
          ? `Preview — menunggu pembayaran sampai ${formatWib(due)}`
          : 'Preview — menunggu pembayaran',
      }
    }
    case 'publish':
      return {
        kind: 'publish',
        label: page.active_until ? `Terbit sampai ${formatWib(page.active_until)}` : 'Terbit',
      }
    case 'expired':
      return { kind: 'expired', label: 'Kedaluwarsa' }
    default:
      return null
  }
}

export function activationButtonLabel(state?: ActivationState): string {
  return state === 'expired' ? 'Perpanjang' : 'Create invoice'
}

// Hanya halaman GrapesJS milik tenant; halaman legacy `sections` dan template tidak bisa dijual.
export function canCreateActivation(page: Pick<LandingPage, 'builder' | 'is_template'>): boolean {
  return page.builder === 'grapesjs' && !page.is_template
}

export function buildActivationPayload(form: ActivationFormState): ActivationInvoicePayload {
  const email = form.buyer_email.trim()
  const payload: ActivationInvoicePayload = {
    buyer_name: form.buyer_name.trim(),
    buyer_contact: form.buyer_contact.trim(),
    ...(email ? { buyer_email: email } : {}),
    price: form.price.trim(),
    duration_value: form.duration_value,
    duration_unit: form.duration_unit,
  }
  if (form.due_unit === 'day') payload.invoice_due_days = form.due_value
  else payload.invoice_due_hours = form.due_value
  return payload
}

function isPositiveInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1
}

export function validateActivationForm(form: ActivationFormState): ActivationFormErrors {
  const errors: ActivationFormErrors = {}
  const name = form.buyer_name.trim()
  if (!name) errors.buyer_name = 'Nama penagih wajib diisi.'
  else if (name.length > 200) errors.buyer_name = 'Maksimal 200 karakter.'
  const contact = form.buyer_contact.trim()
  if (!contact) errors.buyer_contact = 'Kontak wajib diisi.'
  else if (contact.length > 50) errors.buyer_contact = 'Maksimal 50 karakter.'
  const email = form.buyer_email.trim()
  if (email && !EMAIL_PATTERN.test(email)) errors.buyer_email = 'Format email belum valid.'
  const price = form.price.trim()
  if (!PRICE_PATTERN.test(price) || !/[1-9]/.test(price)) {
    errors.price = 'Harga harus angka lebih dari 0 (maksimal 2 desimal, tanpa pemisah ribuan).'
  }
  if (
    !isPositiveInt(form.duration_value) ||
    form.duration_value > MAX_DURATION[form.duration_unit]
  ) {
    errors.duration_value = `Masa aktif 1–${MAX_DURATION[form.duration_unit]} ${durationUnitLabel[form.duration_unit]}.`
  }
  if (!isPositiveInt(form.due_value) || form.due_value > MAX_DUE[form.due_unit]) {
    errors.due_value = `Jatuh tempo 1–${MAX_DUE[form.due_unit]} ${dueUnitLabel[form.due_unit]}.`
  }
  return errors
}

export function activationErrorMessage(error: unknown): string {
  const res = (
    error as {
      response?: {
        status?: number
        data?: { code?: string; message?: string; error?: { code?: string } }
      }
    } | null
  )?.response
  const code = res?.data?.code ?? res?.data?.error?.code
  if (res?.status === 409 && code === 'ACTIVATION_OPEN')
    return 'Masih ada invoice yang menunggu pembayaran untuk halaman ini'
  if (res?.status === 409 && code === 'QUOTA_EXCEEDED') return 'Kuota invoice bulan ini sudah penuh'
  if (res?.status === 403) return 'Fitur ini belum aktif untuk akun Anda'
  if (res?.status === 422 && res.data?.message) return res.data.message
  return 'Gagal membuat invoice. Coba lagi.'
}
