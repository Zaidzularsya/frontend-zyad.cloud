import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import {
  notificationsApi,
  type NotificationLogListParams,
  type NotificationTemplateListParams,
} from '@/features/notifications/api/notifications.api'

export const notificationKeys = {
  all: ['notifications'] as const,
  templates: () => [...notificationKeys.all, 'templates'] as const,
  templateList: (params: NotificationTemplateListParams) =>
    [...notificationKeys.templates(), params] as const,
  logs: () => [...notificationKeys.all, 'logs'] as const,
  logList: (params: NotificationLogListParams) => [...notificationKeys.logs(), params] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
  myPreferences: (organizationId?: string) =>
    [...notificationKeys.preferences(), 'me', organizationId ?? ''] as const,
  userPreferences: (userId: string, organizationId?: string) =>
    [...notificationKeys.preferences(), userId, organizationId ?? ''] as const,
}

export function useNotificationTemplatesQuery(params: Ref<NotificationTemplateListParams>) {
  return useQuery({
    queryKey: computed(() => notificationKeys.templateList(params.value)),
    queryFn: () => notificationsApi.listTemplates(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useNotificationLogsQuery(params: Ref<NotificationLogListParams>) {
  return useQuery({
    queryKey: computed(() => notificationKeys.logList(params.value)),
    queryFn: () => notificationsApi.listLogs(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useTemplateDetailQuery(id: Ref<string>) {
  return useQuery({
    queryKey: computed(() => [...notificationKeys.templates(), 'detail', id.value] as const),
    queryFn: () => notificationsApi.detailTemplate(id.value),
    enabled: computed(() => Boolean(id.value)),
  })
}

export function useLogDetailQuery(id: Ref<string>) {
  return useQuery({
    queryKey: computed(() => [...notificationKeys.logs(), 'detail', id.value] as const),
    queryFn: () => notificationsApi.detailLog(id.value),
    enabled: computed(() => Boolean(id.value)),
  })
}

export function useMyNotificationPreferencesQuery(organizationId: Ref<string>) {
  return useQuery({
    queryKey: computed(() => notificationKeys.myPreferences(organizationId.value)),
    queryFn: () => notificationsApi.listMyPreferences(organizationId.value || undefined),
  })
}

export function useAdminUserNotificationPreferencesQuery(
  userId: Ref<string>,
  organizationId: Ref<string>,
) {
  return useQuery({
    queryKey: computed(() => notificationKeys.userPreferences(userId.value, organizationId.value)),
    queryFn: () =>
      notificationsApi.listUserPreferences(userId.value, organizationId.value || undefined),
    enabled: computed(() => Boolean(userId.value.trim())),
  })
}

export function useCreateNotificationTemplateMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: notificationsApi.createTemplate,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.templates() })
    },
  })
}

export function useUpdateNotificationTemplateMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: Parameters<typeof notificationsApi.updateTemplate>[1]
    }) => notificationsApi.updateTemplate(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.templates() })
      void queryClient.invalidateQueries({
        queryKey: [...notificationKeys.templates(), 'detail', id],
      })
    },
  })
}

export function useDeleteNotificationTemplateMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsApi.deleteTemplate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.templates() })
    },
  })
}

export function usePreviewNotificationTemplateMutation() {
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: Parameters<typeof notificationsApi.previewTemplate>[1]
    }) => notificationsApi.previewTemplate(id, payload),
  })
}

export function useRetryNotificationLogMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsApi.retryLog(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.logs() })
      void queryClient.invalidateQueries({ queryKey: [...notificationKeys.logs(), 'detail', id] })
    },
  })
}

export function useCancelNotificationLogMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsApi.cancelLog(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.logs() })
      void queryClient.invalidateQueries({ queryKey: [...notificationKeys.logs(), 'detail', id] })
    },
  })
}

export function useUpdateMyNotificationPreferencesMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      payload,
      organizationId,
    }: {
      payload: Parameters<typeof notificationsApi.updateMyPreferences>[0]
      organizationId?: string
    }) => notificationsApi.updateMyPreferences(payload, organizationId),
    onSuccess: (_, { organizationId }) => {
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.myPreferences(organizationId),
      })
    },
  })
}

export function useUpdateUserNotificationPreferencesMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      userId,
      payload,
      organizationId,
    }: {
      userId: string
      payload: Parameters<typeof notificationsApi.updateUserPreferences>[1]
      organizationId?: string
    }) => notificationsApi.updateUserPreferences(userId, payload, organizationId),
    onSuccess: (_, { userId, organizationId }) => {
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.userPreferences(userId, organizationId),
      })
    },
  })
}
