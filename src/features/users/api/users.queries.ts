import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import {
  usersApi,
  type UserListParams,
  type CreateUserPayload,
  type UpdateUserPayload,
} from '@/features/users/api/users.api'

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: UserListParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  roles: () => ['roles'] as const,
  permissions: () => ['permissions'] as const,
}

export function useUsersQuery(params: Ref<UserListParams>) {
  return useQuery({
    queryKey: computed(() => userKeys.list(params.value)),
    queryFn: () => usersApi.list(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useUserDetailQuery(id: Ref<string>) {
  return useQuery({
    queryKey: computed(() => userKeys.detail(id.value)),
    queryFn: () => usersApi.detail(id.value),
    enabled: computed(() => Boolean(id.value) && id.value !== 'new'),
  })
}

export function useRolesQuery() {
  return useQuery({
    queryKey: userKeys.roles(),
    queryFn: () => usersApi.listRoles(),
  })
}

export function usePermissionsQuery() {
  return useQuery({
    queryKey: userKeys.permissions(),
    queryFn: () => usersApi.listPermissions(),
  })
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => usersApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

export function useUpdateUserMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateUserPayload) => usersApi.update(id, payload),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all })
      void queryClient.setQueryData(userKeys.detail(id), data)
    },
  })
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all })
      void queryClient.invalidateQueries({ queryKey: userKeys.detail(id) })
    },
  })
}

export function useRestoreUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => usersApi.restore(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all })
      void queryClient.invalidateQueries({ queryKey: userKeys.detail(id) })
    },
  })
}

export function useUpdateUserStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      usersApi.updateStatus(id, { status, reason }),
    onSuccess: (data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all })
      void queryClient.setQueryData(userKeys.detail(id), data)
    },
  })
}

export function useAssignRoleMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { role_id: string; organization_id?: string | null }) =>
      usersApi.assignRole(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.detail(id) })
    },
  })
}

export function useRemoveRoleMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (roleId: string) => usersApi.removeRole(id, roleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.detail(id) })
    },
  })
}

export function useAssignPermissionMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      permission_id: string
      effect: 'allow' | 'deny'
      organization_id?: string | null
    }) => usersApi.assignPermission(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.detail(id) })
    },
  })
}

export function useRemovePermissionMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (permissionId: string) => usersApi.removePermission(id, permissionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.detail(id) })
    },
  })
}
