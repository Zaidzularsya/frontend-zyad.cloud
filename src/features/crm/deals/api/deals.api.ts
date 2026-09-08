import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/types/api'

export type DealStatus = 'open' | 'won' | 'lost'

export interface DealListParams {
  page: number
  per_page: number
  search?: string
  pipeline_id?: string
  stage_id?: string
  status?: DealStatus
  owner_user_id?: string
}

export interface Deal {
  id: string
  pipeline_id: string
  stage_id: string
  company_id?: string | null
  contact_id?: string | null
  title: string
  value: string
  currency: string
  expected_close_date?: string | null
  status: DealStatus
  lost_reason?: string
  owner_user_id?: string
  discount_percent?: string | null
  discount_approved_by?: string
  discount_approved_at?: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface DealPayload {
  pipeline_id: string
  stage_id: string
  company_id?: string
  contact_id?: string
  title: string
  value?: string
  currency?: string
  expected_close_date?: string
  owner_user_id?: string
}

export const dealsApi = {
  list: async (params: DealListParams) => {
    const response = await http.get<{
      success: boolean
      data: Deal[]
      meta: PaginatedResponse<Deal>['meta']
    }>('/app/crm/deals', { params })

    return { data: response.data.data, meta: response.data.meta }
  },

  detail: (id: string) =>
    http
      .get<{ success: boolean; data: Deal }>(`/app/crm/deals/${id}`)
      .then((response) => response.data.data),

  create: (payload: DealPayload) =>
    http
      .post<{ success: boolean; data: Deal }>('/app/crm/deals', payload)
      .then((response) => response.data.data),

  update: (id: string, payload: Partial<DealPayload>) =>
    http
      .patch<{ success: boolean; data: Deal }>(`/app/crm/deals/${id}`, payload)
      .then((response) => response.data.data),

  delete: (id: string) =>
    http.delete(`/app/crm/deals/${id}`).then((response) => response.data.data),

  restore: (id: string) =>
    http
      .post<{ success: boolean; data: Deal }>(`/app/crm/deals/${id}/restore`)
      .then((response) => response.data.data),

  moveStage: (id: string, stageId: string) =>
    http
      .post<{
        success: boolean
        data: Deal
      }>(`/app/crm/deals/${id}/move-stage`, { stage_id: stageId })
      .then((response) => response.data.data),

  closeWon: (id: string) =>
    http
      .post<{ success: boolean; data: Deal }>(`/app/crm/deals/${id}/close-won`)
      .then((response) => response.data.data),

  closeLost: (id: string, lostReason?: string) =>
    http
      .post<{
        success: boolean
        data: Deal
      }>(`/app/crm/deals/${id}/close-lost`, { lost_reason: lostReason })
      .then((response) => response.data.data),
}
