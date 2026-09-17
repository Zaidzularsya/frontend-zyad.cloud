import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import {
  financeARAPApi,
  type CreateFinanceARAPPaymentPayload,
  type CreateFinanceARAPTransactionPayload,
  type FinanceAgingReportParams,
  type FinanceARAPTransactionListParams,
} from '@/features/finance/api/ar-ap.api'
import { financeReportKeys } from '@/features/finance/api/reports.queries'

export const financeARAPKeys = {
  all: ['finance-ar-ap'] as const,
  transactions: (params: FinanceARAPTransactionListParams) =>
    [...financeARAPKeys.all, 'transactions', params] as const,
  aging: (params: FinanceAgingReportParams) => [...financeARAPKeys.all, 'aging', params] as const,
}

export function useFinanceARAPTransactionsQuery(params: Ref<FinanceARAPTransactionListParams>) {
  return useQuery({
    queryKey: computed(() => financeARAPKeys.transactions({ ...params.value })),
    queryFn: () => financeARAPApi.listTransactions(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useCreateFinanceARAPTransactionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateFinanceARAPTransactionPayload) =>
      financeARAPApi.createTransaction(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeARAPKeys.all })
      void queryClient.invalidateQueries({ queryKey: financeReportKeys.all })
    },
  })
}

export function useCreateFinanceARAPPaymentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateFinanceARAPPaymentPayload) => financeARAPApi.createPayment(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeARAPKeys.all })
      void queryClient.invalidateQueries({ queryKey: financeReportKeys.all })
    },
  })
}

export function useFinanceAgingReportQuery(
  params: Ref<FinanceAgingReportParams>,
  enabled?: Ref<boolean>,
) {
  return useQuery({
    queryKey: computed(() => financeARAPKeys.aging({ ...params.value })),
    queryFn: () => financeARAPApi.agingReport(params.value),
    enabled: enabled ?? computed(() => Boolean(params.value.as_of_date)),
  })
}
