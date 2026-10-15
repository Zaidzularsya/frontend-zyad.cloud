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
  is_customer?: boolean
  address?: Record<string, string>
}

export interface ContactAttachment {
  id: string
  contact_id: string
  asset_object_id: string
  filename: string
  mime_type: string
  size_bytes: number
  created_by?: string
  created_at: string
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

  attachments: (id: string) =>
    http
      .get<{ success: boolean; data: ContactAttachment[] }>(`/app/crm/contacts/${id}/attachments`)
      .then((response) => response.data.data),

  uploadAttachment: (id: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return http
      .post<{
        success: boolean
        data: ContactAttachment
      }>(`/app/crm/contacts/${id}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((response) => response.data.data)
  },

  attachmentDownloadUrl: (id: string, attachmentId: string) =>
    http
      .get<{
        success: boolean
        data: { download_url: string }
      }>(`/app/crm/contacts/${id}/attachments/${attachmentId}/download`)
      .then((response) => response.data.data.download_url),

  deleteAttachment: (id: string, attachmentId: string) =>
    http
      .delete(`/app/crm/contacts/${id}/attachments/${attachmentId}`)
      .then((response) => response.data.data),
}
