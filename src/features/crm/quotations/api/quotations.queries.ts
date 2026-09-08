import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import {
  quotationsApi,
  type QuotationListParams,
  type QuotationPayload,
} from '@/features/crm/quotations/api/quotations.api'

export const quotationKeys = {
  all: ['crm', 'quotations'] as const,
  lists: () => [...quotationKeys.all, 'list'] as const,
  list: (params: QuotationListParams) => [...quotationKeys.lists(), params] as const,
}

export function useQuotationsQuery(params: Ref<QuotationListParams>) {
  return useQuery({
    queryKey: computed(() => quotationKeys.list(params.value)),
    queryFn: () => quotationsApi.list(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useCreateQuotationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: QuotationPayload) => quotationsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quotationKeys.all })
    },
  })
}

export function useDeleteQuotationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => quotationsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quotationKeys.all })
    },
  })
}

export function useSendQuotationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => quotationsApi.send(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quotationKeys.all })
    },
  })
}

export function useApproveQuotationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => quotationsApi.approve(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quotationKeys.all })
    },
  })
}

export function useRejectQuotationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => quotationsApi.reject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quotationKeys.all })
    },
  })
}
