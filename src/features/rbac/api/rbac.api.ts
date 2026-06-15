import { apiClient } from '@/lib/api-client'

export interface PermissionResponse {
  id: string
  name: string
  slug: string
  module: string
  action: string
  description?: string
  created_at?: string
  updated_at?: string
}

export interface CreatePermissionPayload {
  name: string
  description?: string
  module_id?: string
}

export interface UpdatePermissionPayload {
  description?: string
  module_id?: string
}

export interface RoleResponse {
  id: string
  name: string
  slug: string
  description?: string
  is_system: boolean
  created_at?: string
  updated_at?: string
  permissions?: PermissionResponse[]
}

export interface PermissionMatrixResponse {
  roles: RoleResponse[]
  permissions: PermissionResponse[]
  matrix: Record<string, Record<string, string>>
}

export type GroupedPermissionsResponse = Record<string, PermissionResponse[]>

export const rbacApi = {
  listRoles: () => apiClient.get<RoleResponse[]>('/admin/roles'),
  listPermissions: () => apiClient.get<PermissionResponse[]>('/admin/permissions'),
  getPermission: (id: string) => apiClient.get<PermissionResponse>(`/admin/permissions/${id}`),
  createPermission: (payload: CreatePermissionPayload) =>
    apiClient.post<PermissionResponse>('/admin/permissions', payload),
  updatePermission: (id: string, payload: UpdatePermissionPayload) =>
    apiClient.patch<PermissionResponse>(`/admin/permissions/${id}`, payload),
  deletePermission: (id: string) => apiClient.delete<void>(`/admin/permissions/${id}`),
  listGroupedPermissions: () =>
    apiClient.get<GroupedPermissionsResponse>('/admin/permissions/grouped'),
  getPermissionMatrix: () => apiClient.get<PermissionMatrixResponse>('/admin/permission-matrix'),
}
