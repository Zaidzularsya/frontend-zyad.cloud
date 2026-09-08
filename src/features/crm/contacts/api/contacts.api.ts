import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/types/api'

export type ContactLifecycleStage = 'lead' | 'contact' | 'customer' | 'churned'

export interface ContactListParams {
  page: number
  per_page: number
  search?: string
  company_id?: string
  lifecycle_stage?: ContactLifecycleStage
  is_customer?: boolean
}

export interface Contact {
  id: string
  company_id?: string | null
  first_name: string
  last_name?: string
  email?: string
  phone?: string
  job_title?: string
  address: Record<string, unknown>
  tags: string[]
  source?: string
  owner_user_id?: string
  is_customer: boolean
  lifecycle_stage: ContactLifecycleStage
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface ContactPayload {
  company_id?: string
  first_name: string
  last_name?: string
  email?: string
  phone?: string
  job_title?: string
  source?: string
  owner_user_id?: string
  lifecycle_stage?: ContactLifecycleStage
}

export const contactsApi = {
  list: async (params: ContactListParams) => {
    const response = await http.get<{
      success: boolean
      data: Contact[]
      meta: PaginatedResponse<Contact>['meta']
    }>('/app/crm/contacts', { params })

    return { data: response.data.data, meta: response.data.meta }
  },

  detail: (id: string) =>
    http
      .get<{ success: boolean; data: Contact }>(`/app/crm/contacts/${id}`)
      .then((response) => response.data.data),

  create: (payload: ContactPayload) =>
    http
      .post<{ success: boolean; data: Contact }>('/app/crm/contacts', payload)
      .then((response) => response.data.data),

  update: (id: string, payload: Partial<ContactPayload>) =>
    http
      .patch<{ success: boolean; data: Contact }>(`/app/crm/contacts/${id}`, payload)
      .then((response) => response.data.data),

  delete: (id: string) =>
    http.delete(`/app/crm/contacts/${id}`).then((response) => response.data.data),

  restore: (id: string) =>
    http
      .post<{ success: boolean; data: Contact }>(`/app/crm/contacts/${id}/restore`)
      .then((response) => response.data.data),
}
