import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/types/api'
import type { DisqualifyReason, Lead } from '@/features/crm/leads/api/leads.api'

export type ActivityEntityType = 'lead' | 'contact' | 'company' | 'deal'
export type ActivityType =
  | 'call'
  | 'email'
  | 'meeting'
  | 'task'
  | 'note'
  | 'whatsapp'
  | 'quotation_response'
  | 'order'
/** Types a user can create by hand; 'whatsapp', 'quotation_response' and 'order' are written by the system. */
export type ManualActivityType = Exclude<ActivityType, 'whatsapp' | 'quotation_response' | 'order'>
export type ActivityStatus = 'pending' | 'completed' | 'cancelled'

export interface ActivityListParams {
  page: number
  per_page: number
  related_entity_type?: ActivityEntityType
  related_entity_id?: string
  assignee_user_id?: string
  status?: ActivityStatus
}

export type PlaybookRequiredInput = 'none' | 'requirements' | 'disqualify' | 'reschedule'
export type ChannelAction = 'whatsapp' | 'email' | 'call' | 'schedule_meeting' | 'requirements_form'

export interface PlaybookOutcomeOption {
  key: string
  label: string
  required_input: PlaybookRequiredInput
}

export interface ActivityPlaybook {
  run_id: string
  step_key: string
  step_name: string
  attempt_no: number
  max_attempts?: number
  final_review: boolean
  channel_actions: ChannelAction[]
  outcomes: PlaybookOutcomeOption[]
}

export interface CompleteActivityPayload {
  outcome_key?: string
  /** ISO 8601. */
  reschedule_at?: string
  requirements?: {
    summary: string
    budget_estimate?: string
    target_date?: string
    decision_maker?: string
  }
  disqualify?: { reason: DisqualifyReason; note?: string }
}

export interface PlaybookRunSummary {
  id: string
  status: 'active' | 'completed' | 'cancelled'
  result?: string
}

export interface CompleteActivityResult {
  activity: Activity
  lead?: Lead
  next_activity?: Activity
  run?: PlaybookRunSummary
}

export interface Activity {
  id: string
  related_entity_type: ActivityEntityType
  related_entity_id: string
  type: ActivityType
  subject: string
  description?: string
  due_at?: string | null
  completed_at?: string | null
  status: ActivityStatus
  assignee_user_id?: string
  outcome_key?: string
  playbook?: ActivityPlaybook | null
  /** Data terstruktur dari sistem, mis. respons customer atas penawaran. */
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface ActivityPayload {
  related_entity_type: ActivityEntityType
  related_entity_id: string
  type: ActivityType
  subject: string
  description?: string
  due_at?: string
  assignee_user_id?: string
  /** Default pending; 'completed' logs something that already happened. */
  status?: 'pending' | 'completed'
}

export const activitiesApi = {
  list: async (params: ActivityListParams) => {
    const response = await http.get<{
      success: boolean
      data: Activity[]
      meta: PaginatedResponse<Activity>['meta']
    }>('/app/crm/activities', { params })

    return { data: response.data.data, meta: response.data.meta }
  },

  create: (payload: ActivityPayload) =>
    http
      .post<{ success: boolean; data: Activity }>('/app/crm/activities', payload)
      .then((response) => response.data.data),

  update: (id: string, payload: Partial<ActivityPayload>) =>
    http
      .patch<{ success: boolean; data: Activity }>(`/app/crm/activities/${id}`, payload)
      .then((response) => response.data.data),

  delete: (id: string) =>
    http.delete(`/app/crm/activities/${id}`).then((response) => response.data.data),

  complete: (id: string) =>
    http
      .post<{
        success: boolean
        data: CompleteActivityResult
      }>(`/app/crm/activities/${id}/complete`)
      .then((response) => response.data.data.activity),

  completeWithOutcome: (id: string, payload: CompleteActivityPayload) =>
    http
      .post<{
        success: boolean
        data: CompleteActivityResult
      }>(`/app/crm/activities/${id}/complete`, payload)
      .then((response) => response.data.data),

  cancel: (id: string) =>
    http
      .post<{ success: boolean; data: Activity }>(`/app/crm/activities/${id}/cancel`)
      .then((response) => response.data.data),

  assign: (id: string, assigneeUserId: string) =>
    http
      .post<{ success: boolean; data: Activity }>(`/app/crm/activities/${id}/assign`, {
        assignee_user_id: assigneeUserId,
      })
      .then((response) => response.data.data),
}
