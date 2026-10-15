import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/types/api'

import type { BillingFrequency, ChargeType, PaymentTiming } from '@/features/catalog/utils/pricing'

export type SalesOrderStatus = 'draft' | 'confirmed' | 'completed' | 'cancelled'
export type BillingStatus = 'none' | 'pending' | 'done' | 'failed'
export type DeliveryStatus = 'not_applicable' | 'pending' | 'delivered'
export type OrderChannel = 'email' | 'whatsapp'

export interface SalesOrderItem {
  id: string
  description: string
  quantity: string
  unit: string
  unit_price: string
  discount_percent: string
  tax_percent: string
  tax_amount: string
  line_total: string
  charge_type: ChargeType
  billing_frequency: BillingFrequency | null
  payment_timing: PaymentTiming
  delivery_status: DeliveryStatus
  delivered_at: string | null
  delivery_note: string
  invoice_id: string
  position: number
}

export interface DocumentRef {
  id: string
  number: string
  status: string
}

export interface SalesOrder {
  id: string
  so_number: string
  quotation_id: string
  quotation_number: string
  deal_id: string | null
  contact_id: string | null
  company_id: string | null
  status: SalesOrderStatus
  billing_status: BillingStatus
  billing_error: string
  start_date: string | null
  bill_to_name: string
  bill_to_company: string
  bill_to_email: string
  bill_to_phone: string
  bill_to_address: string
  channels: OrderChannel[]
  pic_user_id: string
  currency: string
  subtotal: string
  tax_total: string
  grand_total: string
  first_invoice_total: string
  recurring_totals: Record<string, string>
  initial_invoice: DocumentRef | null
  contract: DocumentRef | null
  items: SalesOrderItem[]
  confirmed_at: string | null
  created_at: string
  updated_at: string
}

export interface SalesOrderDraftForm {
  start_date: string
  bill_to_name: string
  bill_to_company: string
  bill_to_email: string
  bill_to_phone: string
  bill_to_address: string
  channels: OrderChannel[]
  pic_user_id: string
}

export interface SalesOrderListParams {
  page: number
  per_page: number
  status?: SalesOrderStatus
  billing_status?: BillingStatus
  deal_id?: string
  search?: string
}

export interface DeliveryPayload {
  item_ids: string[]
  delivered_at: string
  note?: string
  batch_key: string
}

export interface WonCondition {
  item_id: string
  description: string
  kind: 'prepaid_one_time' | 'prepaid_recurring' | 'postpaid_recurring' | 'postpaid_one_time'
  met: boolean
  label: string
}

export interface WonChecklist {
  sales_order_id: string
  so_number: string
  all_met: boolean
  conditions: WonCondition[]
}

type Envelope<T> = { success: boolean; data: T }
type Paged<T> = { success: boolean; data: T[]; meta: PaginatedResponse<T>['meta'] }

export const salesOrdersApi = {
  list: async (params: SalesOrderListParams) => {
    const r = await http.get<Paged<SalesOrder>>('/app/crm/sales-orders', { params })
    return { data: r.data.data, meta: r.data.meta }
  },
  get: (id: string) =>
    http.get<Envelope<SalesOrder>>(`/app/crm/sales-orders/${id}`).then((r) => r.data.data),
  update: (id: string, form: SalesOrderDraftForm) =>
    http
      .patch<Envelope<SalesOrder>>(`/app/crm/sales-orders/${id}`, {
        ...form,
        start_date: form.start_date || null,
      })
      .then((r) => r.data.data),
  confirm: (id: string) =>
    http.post<Envelope<SalesOrder>>(`/app/crm/sales-orders/${id}/confirm`).then((r) => r.data.data),
  retryBilling: (id: string) =>
    http
      .post<Envelope<SalesOrder>>(`/app/crm/sales-orders/${id}/retry-billing`)
      .then((r) => r.data.data),
  cancel: (id: string) =>
    http.post<Envelope<SalesOrder>>(`/app/crm/sales-orders/${id}/cancel`).then((r) => r.data.data),
  confirmDelivery: (id: string, payload: DeliveryPayload) =>
    http
      .post<Envelope<SalesOrder>>(`/app/crm/sales-orders/${id}/deliveries`, payload)
      .then((r) => r.data.data),
  byDeal: (dealId: string) =>
    http
      .get<Envelope<SalesOrder[]>>(`/app/crm/deals/${dealId}/sales-orders`)
      .then((r) => r.data.data),
  wonChecklist: (dealId: string) =>
    http
      .get<Envelope<WonChecklist[]>>(`/app/crm/deals/${dealId}/won-checklist`)
      .then((r) => r.data.data),
}
