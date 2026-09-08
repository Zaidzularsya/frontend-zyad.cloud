import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/types/api'

export interface PipelineListParams {
  page: number
  per_page: number
  include_archived?: boolean
}

export interface PipelineStage {
  id: string
  name: string
  position: number
  probability: string
  is_won: boolean
  is_lost: boolean
}

export interface Pipeline {
  id: string
  name: string
  is_default: boolean
  archived_at?: string | null
  stages: PipelineStage[]
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface StageInput {
  id?: string
  name: string
  position: number
  probability: string
  is_won: boolean
  is_lost: boolean
}

export interface PipelinePayload {
  name: string
  is_default?: boolean
  stages?: StageInput[]
}

export const pipelinesApi = {
  list: async (params: PipelineListParams) => {
    const response = await http.get<{
      success: boolean
      data: Pipeline[]
      meta: PaginatedResponse<Pipeline>['meta']
    }>('/app/crm/pipelines', { params })

    return { data: response.data.data, meta: response.data.meta }
  },

  detail: (id: string) =>
    http
      .get<{ success: boolean; data: Pipeline }>(`/app/crm/pipelines/${id}`)
      .then((response) => response.data.data),

  create: (payload: PipelinePayload) =>
    http
      .post<{ success: boolean; data: Pipeline }>('/app/crm/pipelines', payload)
      .then((response) => response.data.data),

  update: (id: string, payload: Partial<Pick<PipelinePayload, 'name' | 'is_default'>>) =>
    http
      .patch<{ success: boolean; data: Pipeline }>(`/app/crm/pipelines/${id}`, payload)
      .then((response) => response.data.data),

  delete: (id: string) =>
    http.delete(`/app/crm/pipelines/${id}`).then((response) => response.data.data),

  restore: (id: string) =>
    http
      .post<{ success: boolean; data: Pipeline }>(`/app/crm/pipelines/${id}/restore`)
      .then((response) => response.data.data),

  archive: (id: string) =>
    http
      .post<{ success: boolean; data: Pipeline }>(`/app/crm/pipelines/${id}/archive`)
      .then((response) => response.data.data),

  replaceStages: (id: string, stages: StageInput[]) =>
    http
      .put<{ success: boolean; data: Pipeline }>(`/app/crm/pipelines/${id}/stages`, { stages })
      .then((response) => response.data.data),
}
