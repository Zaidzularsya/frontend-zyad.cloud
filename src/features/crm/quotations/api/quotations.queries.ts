import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { dealKeys } from '@/features/crm/deals/api/deals.queries'
import {
  quotationsApi,
  type QuotationListParams,
  type QuotationPayload,
  type SendQuotationPayload,
  type QuotationUpdatePayload,
} from '@/features/crm/quotations/api/quotations.api'

export const quotationKeys = {
  all: ['crm', 'quotations'] as const,
  lists: () => [...quotationKeys.all, 'list'] as const,
  list: (params: QuotationListParams) => [...quotationKeys.lists(), params] as const,
  detail: (id: string) => [...quotationKeys.all, 'detail', id] as const,
  summary: (id: string, message: string) => [...quotationKeys.all, 'summary', id, message] as const,
  sends: (id: string) => [...quotationKeys.all, 'sends', id] as const,
  responses: (id: string) => [...quotationKeys.all, 'responses', id] as const,
}

// Quotation tampil juga di tab Deal Detail, jadi mutation menyegarkan keduanya.
function useInvalidateQuotations() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: quotationKeys.all })
    void queryClient.invalidateQueries({ queryKey: dealKeys.all })
  }
}

export function useQuotationQuery(id: Ref<string | undefined>) {
  return useQuery({
    queryKey: computed(() => quotationKeys.detail(id.value ?? '')),
    queryFn: () => quotationsApi.get(id.value as string),
    enabled: computed(() => Boolean(id.value)),
  })
}

export function useUpdateQuotationMutation() {
  const invalidate = useInvalidateQuotations()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: QuotationUpdatePayload }) =>
      quotationsApi.update(id, payload),
    onSuccess: invalidate,
  })
}

export function useReviseQuotationMutation() {
  const invalidate = useInvalidateQuotations()
  return useMutation({
    mutationFn: (id: string) => quotationsApi.revise(id),
    onSuccess: invalidate,
  })
}

export function useMarkQuotationSentMutation() {
  const invalidate = useInvalidateQuotations()
  return useMutation({
    mutationFn: (id: string) => quotationsApi.markSent(id),
    onSuccess: invalidate,
  })
}

export function useQuotationsQuery(params: Ref<QuotationListParams>) {
  return useQuery({
    queryKey: computed(() => quotationKeys.list(params.value)),
    queryFn: () => quotationsApi.list(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useCreateQuotationMutation() {
  const invalidate = useInvalidateQuotations()
  return useMutation({
    mutationFn: (payload: QuotationPayload) => quotationsApi.create(payload),
    onSuccess: invalidate,
  })
}

export function useDeleteQuotationMutation() {
  const invalidate = useInvalidateQuotations()
  return useMutation({
    mutationFn: (id: string) => quotationsApi.delete(id),
    onSuccess: invalidate,
  })
}

export function useSendQuotationMutation() {
  const invalidate = useInvalidateQuotations()
  return useMutation({
    mutationFn: (id: string) => quotationsApi.send(id),
    onSuccess: invalidate,
  })
}

export function useApproveQuotationMutation() {
  const invalidate = useInvalidateQuotations()
  return useMutation({
    mutationFn: (id: string) => quotationsApi.approve(id),
    onSuccess: invalidate,
  })
}

export function useRejectQuotationMutation() {
  const invalidate = useInvalidateQuotations()
  return useMutation({
    mutationFn: (id: string) => quotationsApi.reject(id),
    onSuccess: invalidate,
  })
}

export function useSendQuotationViaMutation() {
  const invalidate = useInvalidateQuotations()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SendQuotationPayload }) =>
      quotationsApi.sendVia(id, payload),
    onSuccess: invalidate,
  })
}

export function useQuotationSummaryQuery(
  id: Ref<string>,
  message: Ref<string>,
  enabled: Ref<boolean> = computed(() => true),
) {
  return useQuery({
    queryKey: computed(() => quotationKeys.summary(id.value, message.value)),
    queryFn: () => quotationsApi.summary(id.value, message.value),
    enabled: computed(() => Boolean(id.value) && enabled.value),
    placeholderData: keepPreviousData,
  })
}

export function useQuotationSendsQuery(id: Ref<string>) {
  return useQuery({
    queryKey: computed(() => quotationKeys.sends(id.value)),
    queryFn: () => quotationsApi.sends(id.value),
    enabled: computed(() => Boolean(id.value)),
  })
}

export function useQuotationResponsesQuery(id: Ref<string>, enabled: Ref<boolean>) {
  return useQuery({
    queryKey: computed(() => quotationKeys.responses(id.value)),
    queryFn: () => quotationsApi.responses(id.value),
    enabled: computed(() => Boolean(id.value) && enabled.value),
  })
}

export function useQuotationLinkMutation() {
  return useMutation({ mutationFn: (id: string) => quotationsApi.link(id) })
}
