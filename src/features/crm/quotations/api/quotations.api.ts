import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/types/api'

import type { BillingFrequency, ChargeType, PaymentTiming } from '@/features/catalog/utils/pricing'

export type QuotationStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired' | 'superseded'

export interface LineItem {
  id: string
  description: string
  quantity: string
  unit_price: string
  discount_percent?: string | null
  line_total: string
  position: number
  product_id?: string | null
  sku?: string
  unit?: string
  tax_percent?: string
  tax_amount?: string
  charge_type?: ChargeType
  billing_frequency?: BillingFrequency | null
  payment_timing?: PaymentTiming
}

export interface LineItemInput {
  product_id?: string
  description: string
  quantity: string
  unit_price: string
  discount_percent?: string
  tax_percent?: string
  unit?: string
  charge_type?: ChargeType
  billing_frequency?: BillingFrequency | null
  payment_timing?: PaymentTiming
}

export interface QuotationListParams {
  page: number
  per_page: number
  status?: QuotationStatus
  deal_id?: string
  contact_id?: string
  company_id?: string
}

export interface Quotation {
  id: string
  deal_id?: string | null
  contact_id?: string | null
  company_id?: string | null
  quotation_number: string
  status: QuotationStatus
  valid_until?: string | null
  subtotal: string
  discount_total: string
  tax_total: string
  grand_total: string
  // Quotation lama bisa tanpa field ini (diperlakukan sekali bayar).
  one_time_total?: string
  first_invoice_total?: string
  recurring_totals?: Partial<Record<BillingFrequency, string>>
  currency: string
  notes?: string
  items: LineItem[]
  sent_at?: string | null
  approved_at?: string | null
  rejected_at?: string | null
  revision_of_id?: string | null
  revision_no: number
  has_pdf: boolean
  pdf_generated_at?: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export type SendChannel = 'email' | 'whatsapp'
export type SendMode = 'text' | 'pdf' | 'text_pdf'

export interface QuotationSend {
  id: string
  channel: SendChannel
  mode: SendMode
  recipient: string
  status: 'sent' | 'failed'
  error?: string
  sent_by_name?: string
  sent_at: string
}

export interface SendQuotationPayload {
  channel: SendChannel
  mode: SendMode
  client_request_id: string
  recipient?: string
  message?: string
  mailbox_id?: string
  wa_session_id?: string
}

export interface QuotationSummary {
  subject: string
  text: string
  html: string
}

export type QuotationDecision = Quotation & { suggest_deal_status: string }

export interface QuotationPayload {
  deal_id?: string
  contact_id?: string
  company_id?: string
  quotation_number?: string
  valid_until?: string
  currency?: string
  notes?: string
  /** Kontrak lama (pajak header); UI baru memakai tax_percent per item. */
  tax_total?: string
  items: LineItemInput[]
}

export interface QuotationUpdatePayload {
  valid_until?: string
  notes?: string
  items?: LineItemInput[]
}

export const quotationsApi = {
  list: async (params: QuotationListParams) => {
    const response = await http.get<{
      success: boolean
      data: Quotation[]
      meta: PaginatedResponse<Quotation>['meta']
    }>('/app/crm/quotations', { params })

    return { data: response.data.data, meta: response.data.meta }
  },

  get: (id: string) =>
    http
      .get<{ success: boolean; data: Quotation }>(`/app/crm/quotations/${id}`)
      .then((response) => response.data.data),

  update: (id: string, payload: QuotationUpdatePayload) =>
    http
      .patch<{ success: boolean; data: Quotation }>(`/app/crm/quotations/${id}`, payload)
      .then((response) => response.data.data),

  revise: (id: string) =>
    http
      .post<{ success: boolean; data: Quotation }>(`/app/crm/quotations/${id}/revise`)
      .then((response) => response.data.data),

  pdf: (id: string) =>
    http
      .get(`/app/crm/quotations/${id}/pdf`, { responseType: 'blob' })
      .then((response) => response.data as Blob),

  markSent: (id: string) =>
    http
      .post<{ success: boolean; data: Quotation }>(`/app/crm/quotations/${id}/send`, {
        channel: 'manual',
      })
      .then((response) => response.data.data),

  sendVia: (id: string, payload: SendQuotationPayload) =>
    http
      .post<{
        success: boolean
        data: { quotation: Quotation; send: QuotationSend }
      }>(`/app/crm/quotations/${id}/send`, payload)
      .then((response) => response.data.data),

  summary: (id: string, message?: string) =>
    http
      .get<{ success: boolean; data: QuotationSummary }>(`/app/crm/quotations/${id}/summary`, {
        params: { message: message || undefined },
      })
      .then((response) => response.data.data),

  sends: (id: string) =>
    http
      .get<{ success: boolean; data: QuotationSend[] }>(`/app/crm/quotations/${id}/sends`)
      .then((response) => response.data.data),

  create: (payload: QuotationPayload) =>
    http
      .post<{ success: boolean; data: Quotation }>('/app/crm/quotations', payload)
      .then((response) => response.data.data),

  delete: (id: string) =>
    http.delete(`/app/crm/quotations/${id}`).then((response) => response.data.data),

  send: (id: string) =>
    http
      .post<{ success: boolean; data: Quotation }>(`/app/crm/quotations/${id}/send`)
      .then((response) => response.data.data),

  approve: (id: string) =>
    http
      .post<{ success: boolean; data: QuotationDecision }>(`/app/crm/quotations/${id}/approve`)
      .then((response) => response.data.data),

  reject: (id: string) =>
    http
      .post<{ success: boolean; data: QuotationDecision }>(`/app/crm/quotations/${id}/reject`)
      .then((response) => response.data.data),
}
