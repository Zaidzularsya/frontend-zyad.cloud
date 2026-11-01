import { http } from '@/lib/http'
import type { ApiEnvelope, PaginatedResponse } from '@/types/api'

import type { EntryKind, EntryPayload } from '@/features/settlement/utils/settlement'

// Semua nominal adalah string desimal IDR (2 desimal).
export interface SettlementBalance {
  paid_in: string
  settled: string
  adjusted: string
  balance: string
}

export interface OrgBalance extends SettlementBalance {
  organization_id: string
  organization_name: string
}

export interface SettlementEntry {
  id: string
  organization_id: string
  kind: EntryKind
  amount: string
  invoice_id?: string
  provider_reference?: string
  note: string
  occurred_at: string
  created_at: string
}

export interface PageParams {
  page: number
  per_page: number
  search?: string
}

async function paged<T>(promise: Promise<{ data: ApiEnvelope<T[]> }>) {
  const response = await promise
  return {
    data: response.data.data,
    meta: response.data.meta as PaginatedResponse<T>['meta'],
  }
}

export const settlementApi = {
  platform: {
    list: (params: PageParams) => paged<OrgBalance>(http.get('/platform/settlements', { params })),
    entries: (orgId: string, params: PageParams) =>
      paged<SettlementEntry>(http.get(`/platform/settlements/${orgId}/entries`, { params })),
    record: async (orgId: string, payload: EntryPayload) => {
      const response = await http.post<ApiEnvelope<SettlementEntry>>(
        `/platform/settlements/${orgId}/entries`,
        payload,
      )
      return response.data.data
    },
  },
  own: {
    balance: async () => {
      const response = await http.get<ApiEnvelope<SettlementBalance>>('/app/settlement/balance')
      return response.data.data
    },
    entries: (params: PageParams) =>
      paged<SettlementEntry>(http.get('/app/settlement/entries', { params })),
  },
}
