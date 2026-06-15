import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'

import { rbacApi } from '@/features/rbac/api/rbac.api'

export const rbacKeys = {
  all: ['rbac'] as const,
  roles: () => [...rbacKeys.all, 'roles'] as const,
  permissions: () => [...rbacKeys.all, 'permissions'] as const,
  groupedPermissions: () => [...rbacKeys.all, 'grouped-permissions'] as const,
  matrix: () => [...rbacKeys.all, 'matrix'] as const,
}

export function useRbacRolesQuery() {
  return useQuery({
    queryKey: rbacKeys.roles(),
    queryFn: () => rbacApi.listRoles(),
  })
}

export function useRbacPermissionsQuery() {
  return useQuery({
    queryKey: rbacKeys.permissions(),
    queryFn: () => rbacApi.listPermissions(),
  })
}

export function useGroupedPermissionsQuery() {
  return useQuery({
    queryKey: rbacKeys.groupedPermissions(),
    queryFn: () => rbacApi.listGroupedPermissions(),
  })
}

export function usePermissionMatrixQuery() {
  return useQuery({
    queryKey: rbacKeys.matrix(),
    queryFn: () => rbacApi.getPermissionMatrix(),
  })
}

export function useCreatePermissionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: rbacApi.createPermission,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rbacKeys.all })
    },
  })
}

export function useUpdatePermissionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: Parameters<typeof rbacApi.updatePermission>[1]
    }) => rbacApi.updatePermission(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: rbacKeys.all })
      void queryClient.invalidateQueries({ queryKey: ['permission', id] })
    },
  })
}

export function useDeletePermissionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => rbacApi.deletePermission(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rbacKeys.all })
    },
  })
}
