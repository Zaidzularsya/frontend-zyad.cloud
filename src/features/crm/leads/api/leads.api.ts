import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/types/api'
import type { Company } from '@/features/crm/companies/api/companies.api'
import type { Deal } from '@/features/crm/deals/api/deals.api'
import type { Contact } from '@/features/crm/contacts/api/contacts.api'
import type { Activity, ActivityType } from '@/features/crm/activities/api/activities.api'

export type LeadStatus =
  | 'new'
  | 'attempting'
  | 'contacted'
  | 'qualified'
  | 'unqualified'
  | 'converted'

export type DisqualifyReason =
  | 'unresponsive'
  | 'not_interested'
  | 'not_fit'
  | 'budget'
  | 'competitor'
  | 'bad_data'
  | 'duplicate'
  | 'bad_timing'

export type LeadSortKey = 'created_at' | 'updated_at' | 'contact_name' | 'score' | 'status'
/** Sort key, "-" prefix = descending. */
export type LeadSort = LeadSortKey | `-${LeadSortKey}`

export interface LeadListParams {
  page: number
  per_page: number
  search?: string
  status?: LeadStatus
  owner_user_id?: string
  source?: string
  /** Lead yang di-convert menjadi contact ini. */
  converted_contact_id?: string
  /** YYYY-MM-DD, inclusive. */
  created_from?: string
  created_to?: string
  sort?: LeadSort
}

export type LeadDashboardGranularity = 'day' | 'month'

export interface LeadDashboardParams {
  /** YYYY-MM-DD, inclusive (Asia/Jakarta). */
  from: string
  to: string
  granularity?: LeadDashboardGranularity
}

/** Count in the selected range vs the previous range of equal length. */
export interface LeadPeriodCount {
  current: number
  previous: number
}

export type LeadActivityKind =
  | 'created'
  | 'status_changed'
  | 'assigned'
  | 'converted'
  | 'deleted'
  | 'restored'
  | 'playbook_started'
  | 'playbook_ended'
  | 'activity_created'
  | 'activity_completed'

export interface LeadActivityItem {
  kind: LeadActivityKind
  occurred_at: string
  lead_id: string
  lead_name: string
  actor_user_id?: string
  actor_name?: string
  from_value?: string
  to_value?: string
  from_name?: string
  to_name?: string
  activity_id?: string
  activity_type?: ActivityType
  subject?: string
}

export interface LeadFollowUp extends Activity {
  step_name?: string
  lead_name: string
  company_name?: string
  assignee_name?: string
}

export interface LeadDashboard {
  range: {
    from: string
    to: string
    previous_from: string
    previous_to: string
    granularity: LeadDashboardGranularity
  }
  status_counts: Record<LeadStatus, number>
  status_entered: Record<LeadStatus, LeadPeriodCount>
  created: LeadPeriodCount
  converted: LeadPeriodCount
  series: { bucket: string; created: number; converted: number }[]
  /** source "" = lead without a source. */
  by_source: { source: string; count: number }[]
  follow_up_summary: {
    pending: number
    overdue: number
    due_today: number
    due_next_7_days: number
  }
  upcoming_follow_ups: LeadFollowUp[]
  recent_activity: LeadActivityItem[]
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

export interface LeadPlaybookRun {
  run_id: string
  status: 'active' | 'completed' | 'cancelled'
  result?: string
  step_key?: string
  step_name?: string
  due_at?: string | null
  attempt_no?: number
  final_review: boolean
}

export interface LeadEvent {
  id: string
  lead_id: string
  event_type: LeadActivityKind
  from_value?: string
  to_value?: string
  actor_user_id?: string
  actor_name?: string
  from_name?: string
  to_name?: string
  created_at: string
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
  requirement_summary?: string
  budget_estimate?: string | null
  target_date?: string | null
  decision_maker?: string
  disqualify_reason?: DisqualifyReason
  disqualify_note?: string
  playbook_run?: LeadPlaybookRun | null
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
  /** Form kebutuhan; "" mengosongkan nilai. */
  requirement_summary?: string
  budget_estimate?: string
  target_date?: string
  decision_maker?: string
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

export interface ConvertCompanyInput {
  mode: 'none' | 'existing' | 'new'
  company_id?: string
  name?: string
  industry?: string
  website?: string
  phone?: string
}

export interface ConvertDealInput {
  pipeline_id: string
  stage_id: string
  title: string
  value?: string
  expected_close_date?: string
  description?: string
  decision_maker?: string
  owner_user_id?: string
}

export interface ConvertLeadPayload {
  owner_user_id?: string
  company?: ConvertCompanyInput
  deal?: ConvertDealInput
  create_company?: boolean
}

export interface LeadConversionResult {
  lead: Lead
  contact: Contact
  company?: Company
  deal?: Deal
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

  dashboard: (params: LeadDashboardParams) =>
    http
      .get<{ success: boolean; data: LeadDashboard }>('/app/crm/leads/dashboard', { params })
      .then((response) => response.data.data),

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

  disqualify: (id: string, payload: { reason: DisqualifyReason; note?: string }) =>
    http
      .post<{ success: boolean; data: Lead }>(`/app/crm/leads/${id}/disqualify`, payload)
      .then((response) => response.data.data),

  startPlaybook: (id: string) =>
    http
      .post<{
        success: boolean
        data: { id: string; status: string }
      }>(`/app/crm/leads/${id}/playbook/start`)
      .then((response) => response.data.data),

  events: async (id: string, params: { page: number; per_page: number }) => {
    const response = await http.get<{
      success: boolean
      data: LeadEvent[]
      meta: PaginatedResponse<LeadEvent>['meta']
    }>(`/app/crm/leads/${id}/events`, { params })
    return { data: response.data.data, meta: response.data.meta }
  },

  convert: (id: string, payload: ConvertLeadPayload) =>
    http
      .post<{
        success: boolean
        data: LeadConversionResult
      }>(`/app/crm/leads/${id}/convert`, payload)
      .then((response) => response.data.data),

  createDeal: (id: string, payload: ConvertDealInput) =>
    http
      .post<{
        success: boolean
        data: { lead: Lead; deal: Deal }
      }>(`/app/crm/leads/${id}/deal`, payload)
      .then((response) => response.data.data),
}
