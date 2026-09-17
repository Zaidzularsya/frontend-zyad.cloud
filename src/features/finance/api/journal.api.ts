import { http } from '@/lib/http'
import { apiClient } from '@/lib/api-client'
import type { ApiEnvelope, PaginatedResponse } from '@/types/api'

export type FinanceJournalStatus = 'draft' | 'posted' | 'reversed'
export type FinanceSubledgerType = 'none' | 'customer' | 'vendor' | 'asset' | 'tax_code'

export interface FinanceJournalLine {
  id: string
  line_number: number
  account_id: string
  account_code?: string
  account_name?: string
  debit: string
  credit: string
  description?: string
  subledger_type: FinanceSubledgerType
  subledger_id?: string | null
}

export interface FinanceJournalEntry {
  id: string
  entry_number: string
  entry_date: string
  fiscal_period_id: string
  source_type: string
  reference?: string
  description?: string
  status: FinanceJournalStatus
  posted_at?: string | null
  reversed_by_entry_id?: string | null
  lines?: FinanceJournalLine[]
  total_debit: string
  total_credit: string
  created_at: string
  updated_at: string
}

export interface FinanceJournalListParams {
  page?: number
  per_page?: number
  start_date?: string
  end_date?: string
  status?: FinanceJournalStatus | ''
}

export interface CreateFinanceJournalLinePayload {
  account_id: string
  debit?: string
  credit?: string
  description?: string
}

export interface CreateFinanceJournalEntryPayload {
  entry_date: string
  reference?: string
  description?: string
  lines: CreateFinanceJournalLinePayload[]
}

export interface ReverseFinanceJournalEntryPayload {
  reversal_date?: string
  reason?: string
}

export const financeJournalApi = {
  async list(params: FinanceJournalListParams = {}) {
    const response = await http.get<ApiEnvelope<FinanceJournalEntry[]>>(
      '/platform/finance/journal-entries',
      { params },
    )
    return {
      data: response.data.data,
      meta: response.data.meta as PaginatedResponse<FinanceJournalEntry>['meta'],
    }
  },
  get(id: string) {
    return apiClient.get<FinanceJournalEntry>(`/platform/finance/journal-entries/${id}`)
  },
  create(payload: CreateFinanceJournalEntryPayload) {
    return apiClient.post<FinanceJournalEntry, CreateFinanceJournalEntryPayload>(
      '/platform/finance/journal-entries',
      payload,
    )
  },
  reverse(id: string, payload: ReverseFinanceJournalEntryPayload) {
    return apiClient.post<FinanceJournalEntry, ReverseFinanceJournalEntryPayload>(
      `/platform/finance/journal-entries/${id}/reverse`,
      payload,
    )
  },
}
