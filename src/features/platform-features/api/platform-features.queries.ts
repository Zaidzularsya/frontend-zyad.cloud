import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import {
  platformFeaturesApi,
  type CreatePlatformFeaturePayload,
  type PlatformFeatureListParams,
  type UpdatePlatformFeaturePayload,
} from '@/features/platform-features/api/platform-features.api'

export const platformFeatureKeys = {
  all: ['platform-features'] as const,
  list: (params: PlatformFeatureListParams) =>
    [...platformFeatureKeys.all, 'list', params] as const,
}

export function usePlatformFeaturesQuery(params: Ref<PlatformFeatureListParams>) {
  return useQuery({
    queryKey: computed(() => platformFeatureKeys.list({ ...params.value })),
    queryFn: () => platformFeaturesApi.list(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useCreatePlatformFeatureMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreatePlatformFeaturePayload) => platformFeaturesApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: platformFeatureKeys.all })
    },
  })
}

export function useUpdatePlatformFeatureMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePlatformFeaturePayload }) =>
      platformFeaturesApi.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: platformFeatureKeys.all })
    },
  })
}
