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
  /** Hanya true bila organisasi punya pembayaran online (checkout menyusul di rilis berikutnya). */
  can_pay: boolean
  items: PublicInvoiceItem[]
}

interface Envelope<T> {
  success: boolean
  data: T
}

const base = (token: string) => `/public/invoices/${encodeURIComponent(token)}`

export const publicInvoiceApi = {
  get: async (token: string): Promise<PublicInvoice> =>
    (await http.get<Envelope<PublicInvoice>>(base(token))).data.data,

  /** URL same-origin untuk <object>; backend melayani inline tanpa cache. */
  pdfUrl: (token: string): string => `/api/v1${base(token)}/pdf`,
}
