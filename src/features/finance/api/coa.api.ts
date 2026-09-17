import { apiClient } from '@/lib/api-client'

export type FinanceNormalBalance = 'debit' | 'credit'
export type FinanceFiscalStatus = 'open' | 'closed'

export interface FinanceAccountType {
  id: string
  code: string
  name: string
  normal_balance: FinanceNormalBalance
  financial_statement: 'balance_sheet' | 'profit_loss'
  sort_order: number
}

export interface FinanceAccountCategory {
  id: string
  account_type_id: string
  code: string
  name: string
  report_section: string
  sort_order: number
}

export interface FinanceAccount {
  id: string
  account_code: string
  account_name: string
  account_category_id?: string | null
  account_category_code?: string
  account_category_name?: string
  account_type_code?: string
  parent_account_id?: string | null
  is_header: boolean
  normal_balance: FinanceNormalBalance
  is_active: boolean
  opening_balance: string
  opening_balance_date?: string | null
  description?: string
  created_at: string
  updated_at: string
}

export interface FinanceAccountListParams {
  include_inactive?: boolean
  category_id?: string
}

export interface CreateFinanceAccountPayload {
  account_code: string
  account_name: string
  account_category_id?: string
  parent_account_id?: string
  is_header: boolean
  normal_balance: FinanceNormalBalance
  opening_balance?: string
  opening_balance_date?: string | null
  description?: string
}

export interface UpdateFinanceAccountPayload {
  account_name: string
  account_category_id?: string
  parent_account_id?: string
  is_active: boolean
  opening_balance?: string
  opening_balance_date?: string | null
  description?: string
}

export interface FinanceFiscalPeriod {
  id: string
  fiscal_year_id: string
  period_number: number
  start_date: string
  end_date: string
  status: FinanceFiscalStatus
  closed_at?: string | null
}

export interface FinanceFiscalYear {
  id: string
  year: number
  start_date: string
  end_date: string
  status: FinanceFiscalStatus
  closed_at?: string | null
  periods?: FinanceFiscalPeriod[]
}

export const financeAccountApi = {
  listTypes() {
    return apiClient.get<FinanceAccountType[]>('/platform/finance/account-types')
  },
  listCategories() {
    return apiClient.get<FinanceAccountCategory[]>('/platform/finance/account-categories')
  },
  list(params: FinanceAccountListParams = {}) {
    return apiClient.get<FinanceAccount[]>('/platform/finance/accounts', { params })
  },
  get(id: string) {
    return apiClient.get<FinanceAccount>(`/platform/finance/accounts/${id}`)
  },
  create(payload: CreateFinanceAccountPayload) {
    return apiClient.post<FinanceAccount, CreateFinanceAccountPayload>(
      '/platform/finance/accounts',
      payload,
    )
  },
  update(id: string, payload: UpdateFinanceAccountPayload) {
    return apiClient.put<FinanceAccount, UpdateFinanceAccountPayload>(
      `/platform/finance/accounts/${id}`,
      payload,
    )
  },
}

export const financeFiscalApi = {
  list() {
    return apiClient.get<FinanceFiscalYear[]>('/platform/finance/fiscal-years')
  },
  create(year: number) {
    return apiClient.post<FinanceFiscalYear, { year: number }>('/platform/finance/fiscal-years', {
      year,
    })
  },
  closeYear(id: string) {
    return apiClient.post<FinanceFiscalYear>(`/platform/finance/fiscal-years/${id}/close`)
  },
  reopenYear(id: string) {
    return apiClient.post<FinanceFiscalYear>(`/platform/finance/fiscal-years/${id}/reopen`)
  },
  closePeriod(id: string) {
    return apiClient.post<FinanceFiscalPeriod>(`/platform/finance/fiscal-periods/${id}/close`)
  },
  reopenPeriod(id: string) {
    return apiClient.post<FinanceFiscalPeriod>(`/platform/finance/fiscal-periods/${id}/reopen`)
  },
}
