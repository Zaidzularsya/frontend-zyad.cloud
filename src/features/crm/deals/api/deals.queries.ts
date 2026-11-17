import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { dealsApi, type DealListParams, type DealPayload } from '@/features/crm/deals/api/deals.api'
import { useInvalidateEntitlements } from '@/features/entitlements/api/entitlements.queries'
import { isQuotaExceededError } from '@/features/entitlements/utils/quota-error'

export const dealKeys = {
  all: ['crm', 'deals'] as const,
  lists: () => [...dealKeys.all, 'list'] as const,
  list: (params: DealListParams) => [...dealKeys.lists(), params] as const,
  details: () => [...dealKeys.all, 'detail'] as const,
  detail: (id: string) => [...dealKeys.details(), id] as const,
}

export function useDealQuery(id: Ref<string | undefined>) {
  return useQuery({
    queryKey: computed(() => dealKeys.detail(id.value ?? '')),
    queryFn: () => dealsApi.detail(id.value as string),
    enabled: computed(() => Boolean(id.value)),
  })
}

export function useDealsQuery(params: Ref<DealListParams>) {
  return useQuery({
    queryKey: computed(() => dealKeys.list(params.value)),
    queryFn: () => dealsApi.list(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useCreateDealMutation() {
  const queryClient = useQueryClient()
  const invalidateEntitlements = useInvalidateEntitlements()
  return useMutation({
    mutationFn: (payload: DealPayload) => dealsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dealKeys.all })
      invalidateEntitlements()
    },
    onError: (error: unknown) => {
      if (isQuotaExceededError(error)) invalidateEntitlements()
    },
  })
}

export function useUpdateDealMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<DealPayload> }) =>
      dealsApi.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dealKeys.all })
    },
  })
}

export function useDeleteDealMutation() {
  const queryClient = useQueryClient()
  const invalidateEntitlements = useInvalidateEntitlements()
  return useMutation({
    mutationFn: (id: string) => dealsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dealKeys.all })
      invalidateEntitlements()
    },
  })
}

export function useMoveDealStageMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, stageId }: { id: string; stageId: string }) =>
      dealsApi.moveStage(id, stageId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dealKeys.all })
    },
  })
}

export function useCloseDealWonMutation() {
  const queryClient = useQueryClient()
  const invalidateEntitlements = useInvalidateEntitlements()
  return useMutation({
    mutationFn: (id: string) => dealsApi.closeWon(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dealKeys.all })
      invalidateEntitlements()
    },
  })
}

export function useCloseDealLostMutation() {
  const queryClient = useQueryClient()
  const invalidateEntitlements = useInvalidateEntitlements()
  return useMutation({
    mutationFn: ({ id, lostReason }: { id: string; lostReason?: string }) =>
      dealsApi.closeLost(id, lostReason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dealKeys.all })
      invalidateEntitlements()
    },
  })
}
