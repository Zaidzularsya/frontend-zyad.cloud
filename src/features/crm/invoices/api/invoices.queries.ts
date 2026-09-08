import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import {
  invoicesApi,
  type InvoiceListParams,
  type InvoicePayload,
} from '@/features/crm/invoices/api/invoices.api'

export const invoiceKeys = {
  all: ['crm', 'invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (params: InvoiceListParams) => [...invoiceKeys.lists(), params] as const,
}

export function useInvoicesQuery(params: Ref<InvoiceListParams>) {
  return useQuery({
    queryKey: computed(() => invoiceKeys.list(params.value)),
    queryFn: () => invoicesApi.list(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useCreateInvoiceMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: InvoicePayload) => invoicesApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
    },
  })
}

export function useDeleteInvoiceMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => invoicesApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
    },
  })
}

export function useSendInvoiceMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => invoicesApi.send(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
    },
  })
}

export function useMarkInvoicePaidMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, amountPaid }: { id: string; amountPaid: string }) =>
      invoicesApi.markPaid(id, amountPaid),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
    },
  })
}

export function useCancelInvoiceMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => invoicesApi.cancel(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
    },
  })
}
