import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { dealKeys } from '@/features/crm/deals/api/deals.queries'
import {
  salesOrdersApi,
  type DeliveryPayload,
  type SalesOrderDraftForm,
  type SalesOrderListParams,
} from '@/features/crm/sales-orders/api/sales-orders.api'

export const salesOrderKeys = {
  all: ['crm', 'sales-orders'] as const,
  list: (params: SalesOrderListParams) => [...salesOrderKeys.all, 'list', params] as const,
  detail: (id: string) => [...salesOrderKeys.all, 'detail', id] as const,
  byDeal: (dealId: string) => [...salesOrderKeys.all, 'by-deal', dealId] as const,
  won: (dealId: string) => [...salesOrderKeys.all, 'won-checklist', dealId] as const,
}

// SO memengaruhi deal (checklist/Won), invoice, dan kontrak: segarkan semuanya setelah mutation.
function useInvalidateOrders() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: salesOrderKeys.all })
    void queryClient.invalidateQueries({ queryKey: ['receivable'] })
    void queryClient.invalidateQueries({ queryKey: dealKeys.all })
  }
}

export function useSalesOrdersQuery(params: Ref<SalesOrderListParams>) {
  return useQuery({
    queryKey: computed(() => salesOrderKeys.list(params.value)),
    queryFn: () => salesOrdersApi.list(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useSalesOrderQuery(id: Ref<string | undefined>) {
  return useQuery({
    queryKey: computed(() => salesOrderKeys.detail(id.value ?? '')),
    queryFn: () => salesOrdersApi.get(id.value as string),
    enabled: computed(() => Boolean(id.value)),
  })
}

export function useDealSalesOrdersQuery(dealId: Ref<string | undefined>) {
  return useQuery({
    queryKey: computed(() => salesOrderKeys.byDeal(dealId.value ?? '')),
    queryFn: () => salesOrdersApi.byDeal(dealId.value as string),
    enabled: computed(() => Boolean(dealId.value)),
  })
}

export function useWonChecklistQuery(dealId: Ref<string | undefined>, enabled: Ref<boolean>) {
  return useQuery({
    queryKey: computed(() => salesOrderKeys.won(dealId.value ?? '')),
    queryFn: () => salesOrdersApi.wonChecklist(dealId.value as string),
    enabled: computed(() => Boolean(dealId.value) && enabled.value),
  })
}

// Mencari SO hasil approve lewat nomor penawaran (SO dibuat server; approve tidak mengembalikan id-nya).
export function useSalesOrderByQuotationQuery(quotationNumber: Ref<string | undefined>) {
  const params = computed<SalesOrderListParams>(() => ({
    page: 1,
    per_page: 1,
    search: quotationNumber.value,
  }))
  return useQuery({
    queryKey: computed(() => salesOrderKeys.list(params.value)),
    queryFn: () => salesOrdersApi.list(params.value),
    enabled: computed(() => Boolean(quotationNumber.value)),
  })
}

export function useUpdateSalesOrderMutation() {
  const invalidate = useInvalidateOrders()
  return useMutation({
    mutationFn: (v: { id: string; form: SalesOrderDraftForm }) =>
      salesOrdersApi.update(v.id, v.form),
    onSuccess: invalidate,
  })
}

export function useConfirmSalesOrderMutation() {
  const invalidate = useInvalidateOrders()
  return useMutation({
    mutationFn: (id: string) => salesOrdersApi.confirm(id),
    onSuccess: invalidate,
  })
}

export function useRetryBillingMutation() {
  const invalidate = useInvalidateOrders()
  return useMutation({
    mutationFn: (id: string) => salesOrdersApi.retryBilling(id),
    onSuccess: invalidate,
  })
}

export function useCancelSalesOrderMutation() {
  const invalidate = useInvalidateOrders()
  return useMutation({
    mutationFn: (id: string) => salesOrdersApi.cancel(id),
    onSuccess: invalidate,
  })
}

export function useConfirmDeliveryMutation() {
  const invalidate = useInvalidateOrders()
  return useMutation({
    mutationFn: (v: { id: string; payload: DeliveryPayload }) =>
      salesOrdersApi.confirmDelivery(v.id, v.payload),
    onSuccess: invalidate,
  })
}
