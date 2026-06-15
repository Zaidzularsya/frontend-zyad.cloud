import { http } from '@/lib/http'

export interface PaginationMeta {
  page: number
  per_page: number
  total: number
  total_pages: number
}

export interface AuditLogResponse {
  id: string
  module: string
  event: string
  actor_user_id?: string
  target_user_id?: string
  target_type: string
  target_id?: string
  metadata: Record<string, unknown>
  ip_address: string
  user_agent: string
  created_at: string
}

export interface LoginHistoryResponse {
  id: string
  user_id?: string
  identifier: string
  event: string
  success: boolean
  ip_address: string
  user_agent: string
  device_name: string
  reason: string
  created_at: string
}

export interface AuditLogQuery {
  page: number
  per_page: number
  module?: string
  event?: string
  actor_user_id?: string
  target_user_id?: string
  search?: string
  created_from?: string
  created_to?: string
  sort?: string
  direction?: string
}

export interface LoginHistoryQuery {
  page: number
  per_page: number
  user_id?: string
  event?: string
  success?: boolean
  ip_address?: string
  search?: string
  created_from?: string
  created_to?: string
  sort?: string
  direction?: string
}

export const auditApi = {
  async listAuditLogs(params: AuditLogQuery) {
    const response = await http.get<{
      success: boolean
      data: AuditLogResponse[]
      meta: PaginationMeta
    }>('/admin/audit-logs', { params })

    return {
      data: response.data.data,
      meta: response.data.meta,
    }
  },

  async listLoginHistories(params: LoginHistoryQuery) {
    const response = await http.get<{
      success: boolean
      data: LoginHistoryResponse[]
      meta: PaginationMeta
    }>('/admin/login-histories', { params })

    return {
      data: response.data.data,
      meta: response.data.meta,
    }
  },
}
