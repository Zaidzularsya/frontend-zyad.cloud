import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/types/api'
import type { LineItem, LineItemInput } from '@/features/crm/quotations/api/quotations.api'

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export interface InvoiceListParams {
  page: number
  per_page: number
  status?: InvoiceStatus
  quotation_id?: string
}

export interface Invoice {
  id: string
  quotation_id?: string | null
  deal_id?: string | null
  contact_id?: string | null
  company_id?: string | null
  invoice_number: string
  status: InvoiceStatus
  issue_date?: string | null
  due_date?: string | null
  subtotal: string
  tax_total: string
  grand_total: string
  amount_paid: string
  paid_at?: string | null
  currency: string
  items: LineItem[]
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface InvoicePayload {
  quotation_id?: string
  deal_id?: string
  contact_id?: string
  company_id?: string
  invoice_number: string
  issue_date?: string
  due_date?: string
  currency?: string
  tax_total?: string
  items?: LineItemInput[]
}

export const invoicesApi = {
  list: async (params: InvoiceListParams) => {
    const response = await http.get<{
      success: boolean
      data: Invoice[]
      meta: PaginatedResponse<Invoice>['meta']
    }>('/app/crm/invoices', { params })

    return { data: response.data.data, meta: response.data.meta }
  },

  create: (payload: InvoicePayload) =>
    http
      .post<{ success: boolean; data: Invoice }>('/app/crm/invoices', payload)
      .then((response) => response.data.data),

  delete: (id: string) =>
    http.delete(`/app/crm/invoices/${id}`).then((response) => response.data.data),

  send: (id: string) =>
    http
      .post<{ success: boolean; data: Invoice }>(`/app/crm/invoices/${id}/send`)
      .then((response) => response.data.data),

  markPaid: (id: string, amountPaid: string) =>
    http
      .post<{ success: boolean; data: Invoice }>(`/app/crm/invoices/${id}/mark-paid`, {
        amount_paid: amountPaid,
      })
      .then((response) => response.data.data),

  cancel: (id: string) =>
    http
      .post<{ success: boolean; data: Invoice }>(`/app/crm/invoices/${id}/cancel`)
      .then((response) => response.data.data),
}
