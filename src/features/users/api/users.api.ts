import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/types/api'
import type { User } from '@/types/user'

export interface UserListParams {
  page: number
  per_page: number
  search?: string
  status?: string
  role?: string
  sort?: string
  direction?: 'asc' | 'desc'
  include_deleted?: boolean
}

export interface CreateUserPayload {
  name: string
  email: string
  username: string
  phone?: string
  password?: string
  status?: string
  roles?: Array<{ role_id: string; organization_id?: string | null }>
  send_invitation?: boolean
}

export interface UpdateUserPayload {
  name?: string
  email?: string
  username?: string
  phone?: string
  job_title?: string
  department?: string
}

export interface UserDetail {
  id: string
  name: string
  email: string
  username: string
  phone?: string
  status: 'active' | 'invited' | 'suspended' | 'banned' | 'deleted' | 'inactive' | 'pending'
  email_verified_at?: string
  phone_verified_at?: string
  last_login_at?: string
  profile?: {
    avatar_url?: string
    bio?: string
    job_title?: string
    department?: string
    company?: string
    address?: string
    timezone?: string
    language?: string
  }
  roles: Array<{
    id: string
    name: string
    slug: string
    organization_id?: string
    assigned_at: string
  }>
  direct_permissions: Array<{
    id: string
    permission_id: string
    slug: string
    effect: 'allow' | 'deny'
    organization_id?: string
    assigned_at: string
  }>
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface Role {
  id: string
  name: string
  slug: string
  description?: string
  scope: string
}

export interface Permission {
  id: string
  name: string
  slug: string
  module: string
  description?: string
}

export const usersApi = {
  list: async (params: UserListParams) => {
    const response = await http.get<{
      success: boolean
      data: User[]
      meta: PaginatedResponse<User>['meta']
    }>('/admin/users', { params })

    return {
      data: response.data.data,
      meta: response.data.meta,
    }
  },

  detail: (id: string) =>
    http
      .get<{ success: boolean; data: UserDetail }>(`/admin/users/${id}`)
      .then((response) => response.data.data),

  create: (payload: CreateUserPayload) =>
    http
      .post<{ success: boolean; data: UserDetail }>('/admin/users', payload)
      .then((response) => response.data.data),

  update: (id: string, payload: UpdateUserPayload) =>
    http
      .patch<{ success: boolean; data: UserDetail }>(`/admin/users/${id}`, payload)
      .then((response) => response.data.data),

  delete: (id: string) => http.delete(`/admin/users/${id}`).then((response) => response.data.data),

  restore: (id: string) =>
    http
      .post<{ success: boolean; data: UserDetail }>(`/admin/users/${id}/restore`)
      .then((response) => response.data.data),

  updateStatus: (id: string, payload: { status: string; reason?: string }) =>
    http
      .patch<{ success: boolean; data: UserDetail }>(`/admin/users/${id}/status`, payload)
      .then((response) => response.data.data),

  assignRole: (id: string, payload: { role_id: string; organization_id?: string | null }) =>
    http.post(`/admin/users/${id}/roles`, payload).then((response) => response.data.data),

  removeRole: (id: string, roleId: string) =>
    http.delete(`/admin/users/${id}/roles/${roleId}`).then((response) => response.data.data),

  assignPermission: (
    id: string,
    payload: { permission_id: string; effect: 'allow' | 'deny'; organization_id?: string | null },
  ) => http.post(`/admin/users/${id}/permissions`, payload).then((response) => response.data.data),

  removePermission: (id: string, permissionId: string) =>
    http
      .delete(`/admin/users/${id}/permissions/${permissionId}`)
      .then((response) => response.data.data),

  listRoles: () =>
    http
      .get<{ success: boolean; data: Role[] }>('/admin/roles')
      .then((response) => response.data.data),

  listPermissions: () =>
    http
      .get<{ success: boolean; data: Permission[] }>('/admin/permissions')
      .then((response) => response.data.data),
}
