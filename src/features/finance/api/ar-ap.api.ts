import { http } from '@/lib/http'
import { apiClient } from '@/lib/api-client'
import type { ApiEnvelope, PaginatedResponse } from '@/types/api'

export type FinanceARAPTransactionType = 'receivable' | 'payable'
export type FinanceARAPTransactionStatus = 'open' | 'partially_paid' | 'paid' | 'void'

export interface FinanceARAPTransaction {
  id: string
  partner_id: string
  partner_code?: string
  partner_name?: string
  transaction_type: FinanceARAPTransactionType
  transaction_date: string
  due_date: string
  reference_number?: string
  amount: string
  contra_account_id: string
  contra_account_code?: string
  contra_account_name?: string
  description?: string
  status: FinanceARAPTransactionStatus
  journal_entry_id: string
  paid_amount: string
  outstanding_amount: string
  created_at: string
  updated_at: string
}

export interface CreateFinanceARAPTransactionPayload {
  partner_id: string
  transaction_type: FinanceARAPTransactionType
  transaction_date: string
  due_date: string
  reference_number?: string
  amount: string
  contra_account_id: string
  description?: string
}

export interface FinanceARAPTransactionListParams {
  partner_id?: string
  transaction_type?: FinanceARAPTransactionType | ''
  status?: FinanceARAPTransactionStatus | ''
  page?: number
  per_page?: number
}

export interface FinanceARAPPayment {
  id: string
  partner_id: string
  payment_date: string
  amount: string
  cash_bank_account_id: string
  cash_bank_account_label?: string
  journal_entry_id: string
  notes?: string
  created_at: string
}

export interface CreateFinanceARAPPaymentPayload {
  partner_id: string
  ar_ap_transaction_id: string
  payment_date: string
  amount: string
  cash_bank_account_id: string
  notes?: string
}

export interface FinanceAgingBucket {
  label: string
  amount: string
}

export interface FinanceAgingRow {
  partner_id: string
  partner_code: string
  partner_name: string
  buckets: FinanceAgingBucket[]
  total: string
}

export interface FinanceAgingReport {
  as_of_date: string
  rows: FinanceAgingRow[]
  grand_total: string
}

export interface FinanceAgingReportParams {
  transaction_type: FinanceARAPTransactionType
  as_of_date: string
}

export const financeARAPApi = {
  async listTransactions(params: FinanceARAPTransactionListParams = {}) {
    const response = await http.get<ApiEnvelope<FinanceARAPTransaction[]>>(
      '/platform/finance/ar-ap-transactions',
      { params },
    )
    return {
      data: response.data.data,
      meta: response.data.meta as PaginatedResponse<FinanceARAPTransaction>['meta'],
    }
  },
  createTransaction(payload: CreateFinanceARAPTransactionPayload) {
    return apiClient.post<FinanceARAPTransaction, CreateFinanceARAPTransactionPayload>(
      '/platform/finance/ar-ap-transactions',
      payload,
    )
  },
  createPayment(payload: CreateFinanceARAPPaymentPayload) {
    return apiClient.post<FinanceARAPPayment, CreateFinanceARAPPaymentPayload>(
      '/platform/finance/ar-ap-payments',
      payload,
    )
  },
  agingReport(params: FinanceAgingReportParams) {
    return apiClient.get<FinanceAgingReport>('/platform/finance/reports/aging', { params })
  },
}
