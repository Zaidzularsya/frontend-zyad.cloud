import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/types/api'

export type IntegrationProvider = 'webhook' | 'whatsapp' | 'email' | 'zapier'

export interface IntegrationListParams {
  page: number
  per_page: number
  provider?: IntegrationProvider
}

export interface Integration {
  id: string
  provider: IntegrationProvider
  name: string
  config: Record<string, unknown>
  has_secret: boolean
  is_active: boolean
  connected_at?: string | null
  last_synced_at?: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface IntegrationPayload {
  provider: IntegrationProvider
  name: string
  config?: Record<string, unknown>
  secret?: string
}

export const integrationsApi = {
  list: async (params: IntegrationListParams) => {
    const response = await http.get<{
      success: boolean
      data: Integration[]
      meta: PaginatedResponse<Integration>['meta']
    }>('/app/crm/integrations', { params })

    return { data: response.data.data, meta: response.data.meta }
  },

  create: (payload: IntegrationPayload) =>
    http
      .post<{ success: boolean; data: Integration }>('/app/crm/integrations', payload)
      .then((response) => response.data.data),

  delete: (id: string) =>
    http.delete(`/app/crm/integrations/${id}`).then((response) => response.data.data),

  connect: (id: string) =>
    http
      .post<{ success: boolean; data: Integration }>(`/app/crm/integrations/${id}/connect`)
      .then((response) => response.data.data),

  revealSecret: (id: string) =>
    http
      .get<{ success: boolean; data: { secret: string } }>(`/app/crm/integrations/${id}/secret`)
      .then((response) => response.data.data.secret),

  updateSecret: (id: string, secret: string) =>
    http
      .put<{
        success: boolean
        data: Integration
      }>(`/app/crm/integrations/${id}/secret`, { secret })
      .then((response) => response.data.data),
}
