import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/types/api'

export type ActivityEntityType = 'lead' | 'contact' | 'company' | 'deal'
export type ActivityType = 'call' | 'email' | 'meeting' | 'task' | 'note'
export type ActivityStatus = 'pending' | 'completed' | 'cancelled'

export interface ActivityListParams {
  page: number
  per_page: number
  related_entity_type?: ActivityEntityType
  related_entity_id?: string
  assignee_user_id?: string
  status?: ActivityStatus
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
      .post<{ success: boolean; data: Activity }>(`/app/crm/activities/${id}/complete`)
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
