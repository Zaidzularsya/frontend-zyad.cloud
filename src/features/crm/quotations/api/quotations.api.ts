import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/types/api'

export type QuotationStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'

export interface LineItem {
  id: string
  description: string
  quantity: string
  unit_price: string
  discount_percent?: string | null
  line_total: string
  position: number
}

export interface LineItemInput {
  description: string
  quantity: string
  unit_price: string
  discount_percent?: string
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
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface QuotationPayload {
  deal_id?: string
  contact_id?: string
  company_id?: string
  quotation_number: string
  valid_until?: string
  currency?: string
  notes?: string
  tax_total?: string
  items: LineItemInput[]
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
      .post<{ success: boolean; data: Quotation }>(`/app/crm/quotations/${id}/approve`)
      .then((response) => response.data.data),

  reject: (id: string) =>
    http
      .post<{ success: boolean; data: Quotation }>(`/app/crm/quotations/${id}/reject`)
      .then((response) => response.data.data),
}
