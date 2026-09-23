import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/types/api'
import type { Company } from '@/features/crm/companies/api/companies.api'
import type { Contact } from '@/features/crm/contacts/api/contacts.api'

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted'

export interface LeadListParams {
  page: number
  per_page: number
  search?: string
  status?: LeadStatus
}

// Bentuk bebas (jsonb) — sama seperti crm_contacts.address; field di bawah
// adalah yang diisi oleh form lead.
export interface LeadAddress {
  street?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
}

export interface Lead {
  id: string
  contact_name: string
  company_name?: string
  email?: string
  phone?: string
  source?: string
  status: LeadStatus
  score: number
  owner_user_id?: string
  owner_name?: string
  notes?: string
  job_title?: string
  annual_revenue?: string | null
  address: LeadAddress
  converted_contact_id?: string | null
  converted_company_id?: string | null
  converted_deal_id?: string | null
  converted_at?: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface LeadPayload {
  contact_name: string
  company_name?: string
  email?: string
  phone?: string
  source?: string
  score?: number
  owner_user_id?: string
  notes?: string
  job_title?: string
  /** String desimal; "" mengosongkan nilai. */
  annual_revenue?: string
  address?: LeadAddress
}

export interface LeadAttachment {
  id: string
  lead_id: string
  asset_object_id: string
  filename: string
  mime_type: string
  size_bytes: number
  created_by?: string
  created_at: string
}

export interface CrmMember {
  user_id: string
  name: string
  email: string
}

export interface LeadConversionResult {
  lead: Lead
  contact: Contact
  company?: Company
}

export const leadsApi = {
  list: async (params: LeadListParams) => {
    const response = await http.get<{
      success: boolean
      data: Lead[]
      meta: PaginatedResponse<Lead>['meta']
    }>('/app/crm/leads', { params })

    return { data: response.data.data, meta: response.data.meta }
  },

  detail: (id: string) =>
    http
      .get<{ success: boolean; data: Lead }>(`/app/crm/leads/${id}`)
      .then((response) => response.data.data),

  create: (payload: LeadPayload) =>
    http
      .post<{ success: boolean; data: Lead }>('/app/crm/leads', payload)
      .then((response) => response.data.data),

  update: (id: string, payload: Partial<LeadPayload & { status: LeadStatus }>) =>
    http
      .patch<{ success: boolean; data: Lead }>(`/app/crm/leads/${id}`, payload)
      .then((response) => response.data.data),

  delete: (id: string) =>
    http.delete(`/app/crm/leads/${id}`).then((response) => response.data.data),

  restore: (id: string) =>
    http
      .post<{ success: boolean; data: Lead }>(`/app/crm/leads/${id}/restore`)
      .then((response) => response.data.data),

  assign: (id: string, ownerUserId: string) =>
    http
      .post<{ success: boolean; data: Lead }>(`/app/crm/leads/${id}/assign`, {
        owner_user_id: ownerUserId,
      })
      .then((response) => response.data.data),

  attachments: (id: string) =>
    http
      .get<{ success: boolean; data: LeadAttachment[] }>(`/app/crm/leads/${id}/attachments`)
      .then((response) => response.data.data),

  uploadAttachment: (id: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return http
      .post<{ success: boolean; data: LeadAttachment }>(`/app/crm/leads/${id}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((response) => response.data.data)
  },

  attachmentDownloadUrl: (id: string, attachmentId: string) =>
    http
      .get<{
        success: boolean
        data: { download_url: string }
      }>(`/app/crm/leads/${id}/attachments/${attachmentId}/download`)
      .then((response) => response.data.data.download_url),

  deleteAttachment: (id: string, attachmentId: string) =>
    http
      .delete(`/app/crm/leads/${id}/attachments/${attachmentId}`)
      .then((response) => response.data.data),

  members: () =>
    http
      .get<{ success: boolean; data: CrmMember[] }>('/app/crm/members')
      .then((response) => response.data.data),

  convert: (id: string, payload: { create_company: boolean; owner_user_id?: string }) =>
    http
      .post<{
        success: boolean
        data: LeadConversionResult
      }>(`/app/crm/leads/${id}/convert`, payload)
      .then((response) => response.data.data),
}
