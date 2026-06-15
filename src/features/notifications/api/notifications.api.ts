import { http } from '@/lib/http'

export type NotificationChannel = 'email' | 'whatsapp' | 'in_app' | 'discord'
export type NotificationTemplateStatus = 'draft' | 'active' | 'inactive' | 'archived'
export type NotificationLogStatus =
  | 'pending'
  | 'processing'
  | 'sent'
  | 'failed'
  | 'cancelled'
  | 'dead'

export interface NotificationTemplateVariable {
  key: string
  description?: string
  required: boolean
  example?: unknown
}

export interface NotificationListMeta {
  limit: number
  offset: number
  count: number
}

export interface NotificationTemplateResponse {
  id: string
  code: string
  name: string
  description?: string
  channel: NotificationChannel
  locale: string
  subject_template?: string
  body_template: string
  available_variables: NotificationTemplateVariable[]
  sample_payload: Record<string, unknown>
  status: NotificationTemplateStatus
  is_system: boolean
  is_active: boolean
  version: number
  created_by?: string
  updated_by?: string
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface CreateNotificationTemplatePayload {
  code: string
  name: string
  description?: string
  channel: NotificationChannel
  locale?: string
  subject_template?: string
  body_template: string
  available_variables?: NotificationTemplateVariable[]
  sample_payload?: Record<string, unknown>
  is_system?: boolean
  is_active?: boolean
  version?: number
}

export interface UpdateNotificationTemplatePayload {
  name?: string
  description?: string
  locale?: string
  subject_template?: string
  body_template?: string
  available_variables?: NotificationTemplateVariable[]
  sample_payload?: Record<string, unknown>
  is_active?: boolean
}

export interface PreviewNotificationTemplatePayload {
  payload: Record<string, unknown>
  locale?: string
}

export interface PreviewNotificationTemplateResponse {
  subject?: string
  body: string
  payload?: Record<string, unknown>
}

export interface NotificationLogResponse {
  id: string
  event_id?: string
  event_type?: string
  template_id?: string
  template_code?: string
  template_version?: number
  organization_id?: string
  channel: NotificationChannel
  recipient_type: string
  recipient_user_id?: string
  recipient_name_snapshot?: string
  recipient_email_snapshot?: string
  recipient_phone_snapshot?: string
  destination: string
  subject?: string
  body: string
  status: NotificationLogStatus
  provider?: string
  provider_message_id?: string
  provider_response?: Record<string, unknown>
  attempts: number
  max_attempts: number
  next_retry_at?: string | null
  error_message?: string
  sent_at?: string | null
  failed_at?: string | null
  cancelled_at?: string | null
  created_at: string
  updated_at: string
}

export interface NotificationPreferenceResponse {
  id: string
  user_id: string
  organization_id?: string
  event_type: string
  channel: NotificationChannel
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface PreferenceRowPayload {
  event_type: string
  channel: NotificationChannel
  is_enabled: boolean
}

export interface BulkPreferencePayload {
  preferences: PreferenceRowPayload[]
}

export interface NotificationTemplateListParams {
  limit: number
  offset: number
  code?: string
  channel?: NotificationChannel
  locale?: string
  status?: NotificationTemplateStatus
  is_active?: boolean
}

export interface NotificationLogListParams {
  limit: number
  offset: number
  event_type?: string
  template_code?: string
  organization_id?: string
  recipient_user_id?: string
  channel?: NotificationChannel
  status?: NotificationLogStatus
}

function unwrapList<T>(data: { data: T; meta?: NotificationListMeta }) {
  return {
    data: data.data,
    meta: data.meta ?? { limit: 0, offset: 0, count: 0 },
  }
}

export const notificationsApi = {
  async listTemplates(params: NotificationTemplateListParams) {
    const response = await http.get<{
      success: boolean
      data: NotificationTemplateResponse[]
      meta?: NotificationListMeta
    }>('/admin/notification-templates', { params })
    return unwrapList(response.data)
  },

  detailTemplate: (id: string) =>
    http
      .get<{
        success: boolean
        data: NotificationTemplateResponse
      }>(`/admin/notification-templates/${id}`)
      .then((response) => response.data.data),

  createTemplate: (payload: CreateNotificationTemplatePayload) =>
    http
      .post<{
        success: boolean
        data: NotificationTemplateResponse
      }>('/admin/notification-templates', payload)
      .then((response) => response.data.data),

  updateTemplate: (id: string, payload: UpdateNotificationTemplatePayload) =>
    http
      .patch<{
        success: boolean
        data: NotificationTemplateResponse
      }>(`/admin/notification-templates/${id}`, payload)
      .then((response) => response.data.data),

  deleteTemplate: (id: string) =>
    http
      .delete<{ success: boolean; data: void }>(`/admin/notification-templates/${id}`)
      .then((response) => response.data.data),

  previewTemplate: (id: string, payload: PreviewNotificationTemplatePayload) =>
    http
      .post<{
        success: boolean
        data: PreviewNotificationTemplateResponse
      }>(`/admin/notification-templates/${id}/preview`, payload)
      .then((response) => response.data.data),

  async listLogs(params: NotificationLogListParams) {
    const response = await http.get<{
      success: boolean
      data: NotificationLogResponse[]
      meta?: NotificationListMeta
    }>('/admin/notification-logs', { params })
    return unwrapList(response.data)
  },

  detailLog: (id: string) =>
    http
      .get<{ success: boolean; data: NotificationLogResponse }>(`/admin/notification-logs/${id}`)
      .then((response) => response.data.data),

  retryLog: (id: string) =>
    http
      .post<{
        success: boolean
        data: NotificationLogResponse
      }>(`/admin/notification-logs/${id}/retry`)
      .then((response) => response.data.data),

  cancelLog: (id: string) =>
    http
      .post<{
        success: boolean
        data: NotificationLogResponse
      }>(`/admin/notification-logs/${id}/cancel`)
      .then((response) => response.data.data),

  listMyPreferences: (organizationId?: string) =>
    http
      .get<{ success: boolean; data: NotificationPreferenceResponse[] }>(
        '/users/me/notification-preferences',
        {
          params: organizationId ? { organization_id: organizationId } : undefined,
        },
      )
      .then((response) => response.data.data),

  updateMyPreferences: (payload: BulkPreferencePayload, organizationId?: string) =>
    http
      .patch<{ success: boolean; data: NotificationPreferenceResponse[] }>(
        '/users/me/notification-preferences',
        payload,
        {
          params: organizationId ? { organization_id: organizationId } : undefined,
        },
      )
      .then((response) => response.data.data),

  listUserPreferences: (userId: string, organizationId?: string) =>
    http
      .get<{ success: boolean; data: NotificationPreferenceResponse[] }>(
        `/admin/users/${userId}/notification-preferences`,
        {
          params: organizationId ? { organization_id: organizationId } : undefined,
        },
      )
      .then((response) => response.data.data),

  updateUserPreferences: (
    userId: string,
    payload: BulkPreferencePayload,
    organizationId?: string,
  ) =>
    http
      .patch<{ success: boolean; data: NotificationPreferenceResponse[] }>(
        `/admin/users/${userId}/notification-preferences`,
        payload,
        {
          params: organizationId ? { organization_id: organizationId } : undefined,
        },
      )
      .then((response) => response.data.data),
}
