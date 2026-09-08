import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import {
  activitiesApi,
  type ActivityListParams,
  type ActivityPayload,
} from '@/features/crm/activities/api/activities.api'

export const activityKeys = {
  all: ['crm', 'activities'] as const,
  lists: () => [...activityKeys.all, 'list'] as const,
  list: (params: ActivityListParams) => [...activityKeys.lists(), params] as const,
}

export function useActivitiesQuery(params: Ref<ActivityListParams>) {
  return useQuery({
    queryKey: computed(() => activityKeys.list(params.value)),
    queryFn: () => activitiesApi.list(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useCreateActivityMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ActivityPayload) => activitiesApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: activityKeys.all })
    },
  })
}

export function useDeleteActivityMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => activitiesApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: activityKeys.all })
    },
  })
}

export function useCompleteActivityMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => activitiesApi.complete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: activityKeys.all })
    },
  })
}

export function useCancelActivityMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => activitiesApi.cancel(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: activityKeys.all })
    },
  })
}
