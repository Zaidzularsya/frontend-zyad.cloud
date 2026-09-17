import { http } from '@/lib/http'
import { apiClient } from '@/lib/api-client'
import type { ApiEnvelope, PaginatedResponse } from '@/types/api'

export type FinanceCashBankType = 'cash' | 'bank'
export type FinanceCashTransactionType = 'cash_in' | 'cash_out' | 'transfer'
export type FinanceReconciliationStatus = 'draft' | 'completed'

export interface FinanceCashBankAccount {
  id: string
  account_id: string
  account_code: string
  account_name: string
  type: FinanceCashBankType
  bank_name?: string
  account_number?: string
  account_holder_name?: string
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateFinanceCashBankAccountPayload {
  account_id: string
  type: FinanceCashBankType
  bank_name?: string
  account_number?: string
  account_holder_name?: string
}

export interface UpdateFinanceCashBankAccountPayload {
  bank_name?: string
  account_number?: string
  account_holder_name?: string
  is_active: boolean
}

export interface FinanceCashTransaction {
  id: string
  cash_bank_account_id: string
  cash_bank_account_label?: string
  transaction_date: string
  transaction_type: FinanceCashTransactionType
  amount: string
  counter_cash_bank_account_id?: string | null
  counter_cash_bank_label?: string
  contra_account_id?: string | null
  contra_account_code?: string
  contra_account_name?: string
  reference?: string
  description?: string
  journal_entry_id: string
  reconciled_at?: string | null
  created_at: string
  updated_at: string
}

export interface CreateFinanceCashTransactionPayload {
  cash_bank_account_id: string
  transaction_date: string
  transaction_type: FinanceCashTransactionType
  amount: string
  counter_cash_bank_account_id?: string
  contra_account_id?: string
  reference?: string
  description?: string
}

export interface FinanceCashTransactionListParams {
  cash_bank_account_id?: string
  start_date?: string
  end_date?: string
  page?: number
  per_page?: number
}

export interface FinanceBankReconciliation {
  id: string
  cash_bank_account_id: string
  statement_date: string
  statement_ending_balance: string
  book_ending_balance: string
  difference: string
  status: FinanceReconciliationStatus
  notes?: string
  completed_at?: string | null
  created_at: string
}

export interface CreateFinanceBankReconciliationPayload {
  cash_bank_account_id: string
  statement_date: string
  statement_ending_balance: string
  notes?: string
}

export const financeCashBankApi = {
  listAccounts(includeInactive = false) {
    return apiClient.get<FinanceCashBankAccount[]>('/platform/finance/cash-bank-accounts', {
      params: { include_inactive: includeInactive },
    })
  },
  createAccount(payload: CreateFinanceCashBankAccountPayload) {
    return apiClient.post<FinanceCashBankAccount, CreateFinanceCashBankAccountPayload>(
      '/platform/finance/cash-bank-accounts',
      payload,
    )
  },
  updateAccount(id: string, payload: UpdateFinanceCashBankAccountPayload) {
    return apiClient.put<FinanceCashBankAccount, UpdateFinanceCashBankAccountPayload>(
      `/platform/finance/cash-bank-accounts/${id}`,
      payload,
    )
  },
  async listTransactions(params: FinanceCashTransactionListParams = {}) {
    const response = await http.get<ApiEnvelope<FinanceCashTransaction[]>>(
      '/platform/finance/cash-transactions',
      { params },
    )
    return {
      data: response.data.data,
      meta: response.data.meta as PaginatedResponse<FinanceCashTransaction>['meta'],
    }
  },
  createTransaction(payload: CreateFinanceCashTransactionPayload) {
    return apiClient.post<FinanceCashTransaction, CreateFinanceCashTransactionPayload>(
      '/platform/finance/cash-transactions',
      payload,
    )
  },
  listReconciliations(cashBankAccountId: string) {
    return apiClient.get<FinanceBankReconciliation[]>(
      `/platform/finance/cash-bank-accounts/${cashBankAccountId}/reconciliations`,
    )
  },
  createReconciliation(payload: CreateFinanceBankReconciliationPayload) {
    return apiClient.post<FinanceBankReconciliation, CreateFinanceBankReconciliationPayload>(
      '/platform/finance/bank-reconciliations',
      payload,
    )
  },
  completeReconciliation(id: string) {
    return apiClient.post<FinanceBankReconciliation>(
      `/platform/finance/bank-reconciliations/${id}/complete`,
    )
  },
}
