import { http } from '@/lib/http'
import { apiClient } from '@/lib/api-client'
import type { ApiEnvelope, PaginatedResponse } from '@/types/api'

export type FinanceTaxCategory = 'output_vat' | 'input_vat' | 'withholding' | 'corporate_income'

export interface FinanceTaxType {
  id: string
  code: string
  name: string
  category: FinanceTaxCategory
}

export interface FinanceTaxRate {
  id: string
  tax_type_id: string
  tax_type_code?: string
  rate_percent: string
  effective_date: string
  end_date?: string
  notes?: string
  created_at: string
}

export interface CreateFinanceTaxRatePayload {
  tax_type_id: string
  rate_percent: string
  effective_date: string
  end_date?: string
  notes?: string
}

export type FinanceTaxDirection = 'increase' | 'decrease'

export interface FinanceTaxTransaction {
  id: string
  tax_type_id: string
  tax_type_code?: string
  tax_type_name?: string
  transaction_date: string
  reference_number?: string
  amount: string
  direction: FinanceTaxDirection
  tax_account_id: string
  tax_account_code?: string
  tax_account_name?: string
  contra_account_id: string
  contra_account_code?: string
  contra_account_name?: string
  description?: string
  journal_entry_id: string
  created_at: string
  updated_at: string
}

export interface CreateFinanceTaxTransactionPayload {
  tax_type_id: string
  transaction_date: string
  reference_number?: string
  amount: string
  direction: FinanceTaxDirection
  tax_account_id: string
  contra_account_id: string
  description?: string
}

export interface FinanceTaxTransactionListParams {
  tax_type_id?: string
  start_date?: string
  end_date?: string
  page?: number
  per_page?: number
}

export interface FinanceTaxSummaryRow {
  tax_type_id: string
  tax_type_code: string
  tax_type_name: string
  increase: string
  decrease: string
  net: string
}

export interface FinanceTaxSummary {
  start_date: string
  end_date: string
  rows: FinanceTaxSummaryRow[]
}

export interface FinanceTaxSummaryParams {
  start_date: string
  end_date: string
}

export const financeTaxApi = {
  listTypes() {
    return apiClient.get<FinanceTaxType[]>('/platform/finance/tax-types')
  },
  listRates(taxTypeId: string) {
    return apiClient.get<FinanceTaxRate[]>('/platform/finance/tax-rates', {
      params: { tax_type_id: taxTypeId },
    })
  },
  createRate(payload: CreateFinanceTaxRatePayload) {
    return apiClient.post<FinanceTaxRate, CreateFinanceTaxRatePayload>(
      '/platform/finance/tax-rates',
      payload,
    )
  },
  async listTransactions(params: FinanceTaxTransactionListParams = {}) {
    const response = await http.get<ApiEnvelope<FinanceTaxTransaction[]>>(
      '/platform/finance/tax-transactions',
      { params },
    )
    return {
      data: response.data.data,
      meta: response.data.meta as PaginatedResponse<FinanceTaxTransaction>['meta'],
    }
  },
  createTransaction(payload: CreateFinanceTaxTransactionPayload) {
    return apiClient.post<FinanceTaxTransaction, CreateFinanceTaxTransactionPayload>(
      '/platform/finance/tax-transactions',
      payload,
    )
  },
  summary(params: FinanceTaxSummaryParams) {
    return apiClient.get<FinanceTaxSummary>('/platform/finance/reports/tax-summary', { params })
  },
}
