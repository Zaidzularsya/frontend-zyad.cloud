import { http } from '@/lib/http'

import type { BillingFrequency, ChargeType, PaymentTiming } from '@/features/catalog/utils/pricing'

/**
 * Halaman publik invoice — tanpa login, diakses lewat token link.
 * Backend: internal/modules/receivable/handler/public_handler.go
 */
// open = issued/overdue; void tetap tampil "dibatalkan" walau linknya dicabut.
export type PublicInvoiceState = 'open' | 'paid' | 'void'

export interface PublicInvoiceItem {
  description: string
  quantity: string
  unit?: string
  unit_price: string
  line_total: string
  charge_type?: ChargeType
  billing_frequency?: BillingFrequency | null
  payment_timing?: PaymentTiming
  period_start?: string | null
  period_end?: string | null
}

export interface PublicInvoice {
  tenant_name: string
  invoice_number: string
  status: 'issued' | 'paid' | 'overdue' | 'void'
  state: PublicInvoiceState
  issue_date?: string | null
  due_date?: string | null
  period_start?: string | null
  period_end?: string | null
  currency: string
  grand_total: string
  amount_paid: string
  balance: string
  /** Hanya true bila organisasi punya pembayaran online (org platform) dan invoice masih open. */
  can_pay: boolean
  items: PublicInvoiceItem[]
}

export interface PublicInvoiceCheckout {
  payment_url: string
  expires_at: string
}

interface Envelope<T> {
  success: boolean
  data: T
}

const base = (token: string) => `/public/invoices/${encodeURIComponent(token)}`

export const publicInvoiceApi = {
  get: async (token: string): Promise<PublicInvoice> =>
    (await http.get<Envelope<PublicInvoice>>(base(token))).data.data,

  /** Membuat/memakai ulang sesi DOKU untuk sisa tagihan. 403 = pembayaran online tidak tersedia. */
  checkout: async (token: string): Promise<PublicInvoiceCheckout> =>
    (await http.post<Envelope<PublicInvoiceCheckout>>(`${base(token)}/checkout`)).data.data,

  /** Status terkini; backend menanyakan DOKU bila webhook belum masuk (throttle 10 detik). */
  status: async (token: string): Promise<{ status: PublicInvoice['status'] }> =>
    (await http.get<Envelope<{ status: PublicInvoice['status'] }>>(`${base(token)}/status`)).data
      .data,

  /** URL same-origin untuk <object>; backend melayani inline tanpa cache. */
  pdfUrl: (token: string): string => `/api/v1${base(token)}/pdf`,
}
