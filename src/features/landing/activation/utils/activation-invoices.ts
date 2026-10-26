import { buildShareMessage, buildWhatsAppUrl } from './activation-share'
import type { DueUnit, DurationUnit } from './activation-state'

export type ActivationInvoiceStatus = 'open' | 'paid' | 'void'
/** open dipecah: awaiting_payment (jendela preview masih berlaku) dan expired (sudah lewat, tetap bisa dibayar). */
export type ActivationInvoiceState = 'awaiting_payment' | 'expired' | 'paid' | 'void'

/** Satu baris GET /app/landing/activations (backend: landing/dto ActivationInvoiceListItem). */
export interface ActivationInvoiceRow {
  id: string
  page_id: string
  page_title: string
  page_slug: string
  page_status: string
  page_active_until: string | null
  invoice_id: string | null
  buyer_name: string
  buyer_contact: string
  buyer_email: string | null
  /** Desimal sebagai string. */
  price: string
  duration_value: number
  duration_unit: DurationUnit
  invoice_due_at: string
  status: ActivationInvoiceStatus
  state: ActivationInvoiceState
  paid_at: string | null
  created_at: string
  /** Link bayar publik; kosong untuk invoice dibatalkan. */
  payment_url: string
}

export interface ActivationInvoicesPage {
  items: ActivationInvoiceRow[]
  meta: { total: number; page: number; per_page: number; total_pages: number }
}

export interface ActivationInvoiceFilter {
  status?: ActivationInvoiceStatus
  page: number
  per_page: number
}

export interface RenewPayload {
  invoice_due_hours?: number
  invoice_due_days?: number
}

export const invoiceStateLabel: Record<ActivationInvoiceState, string> = {
  awaiting_payment: 'Menunggu pembayaran',
  expired: 'Preview kedaluwarsa',
  paid: 'Lunas',
  void: 'Dibatalkan',
}

/** Link preview hanya bisa dibuat ulang untuk invoice yang masih terbuka dan sudah punya invoice. */
export function canRenew(row: ActivationInvoiceRow): boolean {
  return (row.state === 'awaiting_payment' || row.state === 'expired') && !!row.invoice_id
}

// Batas sama dengan backend: jam 1-720, hari 1-30.
const MAX_RENEW: Record<DueUnit, number> = { hour: 720, day: 30 }
const UNIT_LABEL: Record<DueUnit, string> = { hour: 'jam', day: 'hari' }

export function validateRenewForm(value: number, unit: DueUnit): string | null {
  if (!Number.isInteger(value) || value < 1 || value > MAX_RENEW[unit]) {
    return `Masa berlaku 1–${MAX_RENEW[unit]} ${UNIT_LABEL[unit]}.`
  }
  return null
}

export function buildRenewPayload(value: number, unit: DueUnit): RenewPayload {
  return unit === 'day' ? { invoice_due_days: value } : { invoice_due_hours: value }
}

/** Tombol "Kirim tagihan": WhatsApp ke pelanggan berisi link pembayaran (link tidak perlu diperbarui). */
export function paymentShareUrl(row: ActivationInvoiceRow): string | null {
  if (!row.payment_url) return null
  return buildWhatsAppUrl(
    row.buyer_contact,
    buildShareMessage({
      buyerName: row.buyer_name,
      pageTitle: row.page_title,
      paymentUrl: row.payment_url,
    }),
  )
}

interface ApiErrorLike {
  response?: { status?: number; data?: { code?: string; message?: string } }
}

/** Pesan galat untuk "Perbarui link"; 422 membawa pesan server yang bisa ditindaklanjuti (mis. tambah domain). */
export function renewErrorMessage(error: unknown): string {
  const res = (error as ApiErrorLike | null)?.response
  const code = res?.data?.code
  if (res?.status === 409 && code === 'ACTIVATION_NOT_OPEN') {
    return 'Invoice ini sudah dibayar atau dibatalkan, jadi linknya tidak perlu diperbarui.'
  }
  if (res?.status === 404) return 'Invoice tidak ditemukan.'
  if (res?.status === 403) return 'Fitur ini belum aktif untuk akun Anda'
  if (res?.status === 422 && res.data?.message) return res.data.message
  return 'Gagal memperbarui link. Coba lagi.'
}
