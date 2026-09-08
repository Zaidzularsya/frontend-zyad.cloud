import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/types/api'

export interface CompanyListParams {
  page: number
  per_page: number
  search?: string
  owner_user_id?: string
}

export interface Company {
  id: string
  name: string
  industry?: string
  website?: string
  phone?: string
  email?: string
  address: Record<string, unknown>
  size_range?: string
  notes?: string
  tags: string[]
  owner_user_id?: string
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface CompanyPayload {
  name: string
  industry?: string
  website?: string
  phone?: string
  email?: string
  size_range?: string
  notes?: string
  tags?: string[]
  owner_user_id?: string
}

export const companiesApi = {
  list: async (params: CompanyListParams) => {
    const response = await http.get<{
      success: boolean
      data: Company[]
      meta: PaginatedResponse<Company>['meta']
    }>('/app/crm/companies', { params })

    return { data: response.data.data, meta: response.data.meta }
  },

  detail: (id: string) =>
    http
      .get<{ success: boolean; data: Company }>(`/app/crm/companies/${id}`)
      .then((response) => response.data.data),

  create: (payload: CompanyPayload) =>
    http
      .post<{ success: boolean; data: Company }>('/app/crm/companies', payload)
      .then((response) => response.data.data),

  update: (id: string, payload: Partial<CompanyPayload>) =>
    http
      .patch<{ success: boolean; data: Company }>(`/app/crm/companies/${id}`, payload)
      .then((response) => response.data.data),

  delete: (id: string) =>
    http.delete(`/app/crm/companies/${id}`).then((response) => response.data.data),

  restore: (id: string) =>
    http
      .post<{ success: boolean; data: Company }>(`/app/crm/companies/${id}/restore`)
      .then((response) => response.data.data),
}
