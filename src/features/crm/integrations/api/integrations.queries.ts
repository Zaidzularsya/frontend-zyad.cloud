import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import {
  integrationsApi,
  type IntegrationListParams,
  type IntegrationPayload,
} from '@/features/crm/integrations/api/integrations.api'

export const integrationKeys = {
  all: ['crm', 'integrations'] as const,
  lists: () => [...integrationKeys.all, 'list'] as const,
  list: (params: IntegrationListParams) => [...integrationKeys.lists(), params] as const,
}

export function useIntegrationsQuery(params: Ref<IntegrationListParams>) {
  return useQuery({
    queryKey: computed(() => integrationKeys.list(params.value)),
    queryFn: () => integrationsApi.list(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useCreateIntegrationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: IntegrationPayload) => integrationsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationKeys.all })
    },
  })
}

export function useDeleteIntegrationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => integrationsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationKeys.all })
    },
  })
}

export function useConnectIntegrationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => integrationsApi.connect(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationKeys.all })
    },
  })
}

export function useUpdateIntegrationSecretMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, secret }: { id: string; secret: string }) =>
      integrationsApi.updateSecret(id, secret),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationKeys.all })
    },
  })
}
