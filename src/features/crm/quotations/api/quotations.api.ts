import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/types/api'

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
}

export interface LineItemInput {
  product_id?: string
  description: string
  quantity: string
  unit_price: string
  discount_percent?: string
  tax_percent?: string
  unit?: string
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
