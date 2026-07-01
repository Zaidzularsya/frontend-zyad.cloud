import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import {
  billingApi,
  type BillingInvoiceListParams,
  type RequestBillingUpgradePayload,
  type ScheduleBillingCancellationPayload,
} from '@/features/billing/api/billing.api'

export const billingKeys = {
  all: ['billing'] as const,
  currentPlan: (organizationId?: string) =>
    [...billingKeys.all, 'current-plan', organizationId ?? ''] as const,
  invoices: () => [...billingKeys.all, 'invoices'] as const,
  invoiceList: (organizationId: string | undefined, params: BillingInvoiceListParams) =>
    [...billingKeys.invoices(), organizationId ?? '', params] as const,
}

export function useCurrentBillingPlanQuery(organizationId: Ref<string | undefined>) {
  return useQuery({
    queryKey: computed(() => billingKeys.currentPlan(organizationId.value)),
    queryFn: () => billingApi.currentPlan(),
    enabled: computed(() => Boolean(organizationId.value)),
  })
}

export function useBillingInvoicesQuery(
  organizationId: Ref<string | undefined>,
  params: Ref<BillingInvoiceListParams>,
) {
  return useQuery({
    queryKey: computed(() => billingKeys.invoiceList(organizationId.value, { ...params.value })),
    queryFn: () => billingApi.invoices(params.value),
    enabled: computed(() => Boolean(organizationId.value)),
    placeholderData: keepPreviousData,
  })
}

export function useRequestBillingUpgradeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RequestBillingUpgradePayload) => billingApi.requestUpgrade(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingKeys.all })
    },
  })
}

export function useScheduleBillingCancellationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ScheduleBillingCancellationPayload) =>
      billingApi.scheduleCancellation(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingKeys.all })
    },
  })
}
