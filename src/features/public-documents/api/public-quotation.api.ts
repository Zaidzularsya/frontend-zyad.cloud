import { http } from '@/lib/http'

import type { BillingFrequency, ChargeType, PaymentTiming } from '@/features/catalog/utils/pricing'

/**
 * Halaman publik penawaran — tanpa login, diakses lewat token link.
 * Backend: internal/modules/crm/handler/public_quotation_handler.go
 */
export type PublicState = 'active' | 'decided' | 'expired' | 'superseded'

export interface PublicItem {
  description: string
  quantity: string
  unit?: string
  unit_price: string
  line_total: string
  charge_type?: ChargeType
  billing_frequency?: BillingFrequency | null
  payment_timing?: PaymentTiming
  features?: string[]
}

export interface PublicQuotation {
  tenant_name: string
  quotation_number: string
  status: string
  state: PublicState
  valid_until?: string | null
  currency: string
  grand_total: string
  one_time_total: string
  first_invoice_total: string
  recurring_totals: Record<string, string>
  items: PublicItem[]
  last_response?: {
    action: 'approved' | 'revision_requested'
    responder_name: string
    categories?: string[]
    created_at: string
  } | null
}

interface Envelope<T> {
  success: boolean
  data: T
}

const base = (token: string) => `/public/quotations/${encodeURIComponent(token)}`

export const publicQuotationApi = {
  get: async (token: string): Promise<PublicQuotation> =>
    (await http.get<Envelope<PublicQuotation>>(base(token))).data.data,

  /** URL same-origin untuk <object>; backend melayani inline tanpa cache. */
  pdfUrl: (token: string): string => `/api/v1${base(token)}/pdf`,

  approve: async (
    token: string,
    payload: { responder_name: string; agree: true },
  ): Promise<PublicQuotation> =>
    (await http.post<Envelope<PublicQuotation>>(`${base(token)}/approve`, payload)).data.data,

  revision: async (
    token: string,
    payload: { responder_name: string; categories: string[]; note: string },
  ): Promise<PublicQuotation> =>
    (await http.post<Envelope<PublicQuotation>>(`${base(token)}/revision`, payload)).data.data,
}
