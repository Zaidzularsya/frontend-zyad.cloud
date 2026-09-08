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
  notes?: string
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

  convert: (id: string, payload: { create_company: boolean; owner_user_id?: string }) =>
    http
      .post<{
        success: boolean
        data: LeadConversionResult
      }>(`/app/crm/leads/${id}/convert`, payload)
      .then((response) => response.data.data),
}
