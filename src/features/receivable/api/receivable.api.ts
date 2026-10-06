import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/types/api'

import type { BillingFrequency, ChargeType, PaymentTiming } from '@/features/catalog/utils/pricing'

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue' | 'void'
export type SendChannel = 'email' | 'whatsapp'

export interface Account {
  id: string
  name: string
  company_name: string
  email: string
  phone: string
  address: string
  /** Kontak CRM yang terhubung; WhatsApp hanya tersedia bila terisi. */
  contact_id: string | null
  created_at: string
}

export interface AccountPayload {
  name: string
  company_name?: string
  email?: string
  phone?: string
  address?: string
}

export interface InvoiceItem {
  id: string
  description: string
  quantity: string
  unit: string
  unit_price: string
  discount_percent: string | null
  tax_percent: string
  tax_amount: string
  line_total: string
  product_id: string | null
  sku: string
  charge_type: ChargeType
  billing_frequency: BillingFrequency | null
  payment_timing: PaymentTiming
  period_start: string | null
  period_end: string | null
  position: number
}

export interface InvoiceSend {
  id: string
  invoice_id: string
  channel: SendChannel
  recipient: string
  status: 'sent' | 'failed'
  error: string
  trigger: 'auto' | 'manual'
  sent_by: string | null
  sent_by_name: string
  sent_at: string
}

export interface Invoice {
  id: string
  invoice_number?: string | null
  status: InvoiceStatus
  account: Account
  source_type?: string
  source_id?: string | null
  contract_id?: string | null
  period_start?: string | null
  period_end?: string | null
  issue_date?: string | null
  due_date?: string | null
  currency: string
  subtotal: string
  discount_total: string
  tax_total: string
  grand_total: string
  amount_paid: string
  balance: string
  channels: SendChannel[]
  pic_user_id?: string | null
  notes?: string
  void_reason?: string
  paid_at?: string | null
  voided_at?: string | null
  items: InvoiceItem[]
  last_send?: InvoiceSend | null
  created_at: string
}

export interface InvoiceItemPayload {
  product_id?: string
  sku?: string
  description: string
  quantity: string
  unit?: string
  unit_price: string
  discount_percent?: string
  tax_percent?: string
  charge_type: ChargeType
  billing_frequency: BillingFrequency | null
  payment_timing: PaymentTiming
  period_start?: string
  period_end?: string
}

export interface InvoicePayload {
  account_id: string
  channels: SendChannel[]
  pic_user_id?: string
  notes?: string
  period_start?: string
  period_end?: string
  items: InvoiceItemPayload[]
}

export interface InvoiceListParams {
  page: number
  per_page: number
  status?: InvoiceStatus
  account_id?: string
  search?: string
  send_failed?: boolean
}

export interface SendInvoicePayload {
  channel: SendChannel
  client_request_id: string
  recipient?: string
  message?: string
}

export interface Payment {
  id: string
  invoice_id: string
  invoice_number?: string
  account_name?: string
  amount: string
  method: 'manual' | 'doku'
  reference: string
  note: string
  recorded_by: string | null
  paid_at: string
  created_at: string
}

export interface PaymentPayload {
  amount: string
  paid_at?: string
  reference?: string
  note?: string
}

export interface ReceivableSettings {
  invoice_lead_days: number
  payment_terms_days: number
  default_channels: SendChannel[]
  default_sender_user_id: string | null
}

export interface Sender {
  user_id: string
  name: string
  email: string
}

export interface InvoiceLink {
  url: string
  expires_at: string
}

export type ContractStatus = 'active' | 'ended' | 'cancelled'

export interface ContractItem {
  id: string
  description: string
  quantity: string
  unit: string
  unit_price: string
  discount_percent: string
  tax_percent: string
  billing_frequency: BillingFrequency
  payment_timing: PaymentTiming
  period_index: number
  next_period_start: string
  next_period_end: string
}

export interface Contract {
  id: string
  contract_number: string
  status: ContractStatus
  account: Account
  source_type: string
  source_id: string
  currency: string
  start_date: string
  end_date: string | null
  end_reason: string
  ended_at: string | null
  channels: SendChannel[]
  pic_user_id: string
  notes: string
  items: ContractItem[]
  created_at: string
}

export interface ContractListParams {
  page: number
  per_page: number
  status?: ContractStatus
  search?: string
}

type Envelope<T> = { success: boolean; data: T }
type Paged<T> = { success: boolean; data: T[]; meta: PaginatedResponse<T>['meta'] }

export const receivableApi = {
  contracts: {
    list: async (params: ContractListParams) => {
      const r = await http.get<Paged<Contract>>('/app/receivable/contracts', { params })
      return { data: r.data.data, meta: r.data.meta }
    },
    get: (id: string) =>
      http.get<Envelope<Contract>>(`/app/receivable/contracts/${id}`).then((r) => r.data.data),
    setEndDate: (id: string, endDate: string | null) =>
      http
        .patch<Envelope<Contract>>(`/app/receivable/contracts/${id}`, { end_date: endDate })
        .then((r) => r.data.data),
    end: (id: string, payload: { reason: string; end_date?: string }) =>
      http
        .post<Envelope<Contract>>(`/app/receivable/contracts/${id}/end`, payload)
        .then((r) => r.data.data),
  },

  accounts: {
    list: async (params: { page: number; per_page: number; search?: string }) => {
      const r = await http.get<Paged<Account>>('/app/receivable/accounts', { params })
      return { data: r.data.data, meta: r.data.meta }
    },
    create: (payload: AccountPayload) =>
      http.post<Envelope<Account>>('/app/receivable/accounts', payload).then((r) => r.data.data),
  },

  invoices: {
    list: async (params: InvoiceListParams) => {
      const r = await http.get<Paged<Invoice>>('/app/receivable/invoices', {
        params: { ...params, send_failed: params.send_failed || undefined },
      })
      return { data: r.data.data, meta: r.data.meta }
    },
    get: (id: string) =>
      http.get<Envelope<Invoice>>(`/app/receivable/invoices/${id}`).then((r) => r.data.data),
    create: (payload: InvoicePayload) =>
      http.post<Envelope<Invoice>>('/app/receivable/invoices', payload).then((r) => r.data.data),
    update: (id: string, payload: InvoicePayload) =>
      http
        .put<Envelope<Invoice>>(`/app/receivable/invoices/${id}`, payload)
        .then((r) => r.data.data),
    issue: (id: string) =>
      http.post<Envelope<Invoice>>(`/app/receivable/invoices/${id}/issue`).then((r) => r.data.data),
    void: (id: string, reason: string) =>
      http
        .post<Envelope<Invoice>>(`/app/receivable/invoices/${id}/void`, { reason })
        .then((r) => r.data.data),
    pdf: (id: string) =>
      http
        .get(`/app/receivable/invoices/${id}/pdf`, { responseType: 'blob' })
        .then((r) => r.data as Blob),
    link: (id: string) =>
      http
        .post<Envelope<InvoiceLink>>(`/app/receivable/invoices/${id}/link`)
        .then((r) => r.data.data),
    send: (id: string, payload: SendInvoicePayload) =>
      http
        .post<Envelope<InvoiceSend>>(`/app/receivable/invoices/${id}/send`, payload)
        .then((r) => r.data.data),
    sends: (id: string) =>
      http
        .get<Envelope<InvoiceSend[]>>(`/app/receivable/invoices/${id}/sends`)
        .then((r) => r.data.data),
    payments: (id: string) =>
      http
        .get<Envelope<Payment[]>>(`/app/receivable/invoices/${id}/payments`)
        .then((r) => r.data.data),
    recordPayment: (id: string, payload: PaymentPayload) =>
      http
        .post<
          Envelope<{ invoice: Invoice; payment: Payment }>
        >(`/app/receivable/invoices/${id}/payments`, payload)
        .then((r) => r.data.data),
  },

  payments: {
    list: async (params: { page: number; per_page: number }) => {
      const r = await http.get<Paged<Payment>>('/app/receivable/payments', { params })
      return { data: r.data.data, meta: r.data.meta }
    },
  },

  settings: {
    get: () =>
      http.get<Envelope<ReceivableSettings>>('/app/receivable/settings').then((r) => r.data.data),
    update: (payload: {
      invoice_lead_days: number
      payment_terms_days: number
      default_channels: SendChannel[]
      default_sender_user_id?: string
    }) =>
      http
        .put<Envelope<ReceivableSettings>>('/app/receivable/settings', payload)
        .then((r) => r.data.data),
  },

  senders: () =>
    http.get<Envelope<Sender[]>>('/app/receivable/members/senders').then((r) => r.data.data),
}
