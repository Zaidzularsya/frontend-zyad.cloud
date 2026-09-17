import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import {
  financeTaxApi,
  type CreateFinanceTaxRatePayload,
  type CreateFinanceTaxTransactionPayload,
  type FinanceTaxSummaryParams,
  type FinanceTaxTransactionListParams,
} from '@/features/finance/api/tax.api'

export const financeTaxKeys = {
  all: ['finance-tax'] as const,
  types: () => [...financeTaxKeys.all, 'types'] as const,
  rates: (taxTypeId: string) => [...financeTaxKeys.all, 'rates', taxTypeId] as const,
  transactions: (params: FinanceTaxTransactionListParams) =>
    [...financeTaxKeys.all, 'transactions', params] as const,
  summary: (params: FinanceTaxSummaryParams) => [...financeTaxKeys.all, 'summary', params] as const,
}

export function useFinanceTaxTypesQuery() {
  return useQuery({
    queryKey: financeTaxKeys.types(),
    queryFn: () => financeTaxApi.listTypes(),
  })
}

export function useFinanceTaxRatesQuery(taxTypeId: Ref<string>) {
  return useQuery({
    queryKey: computed(() => financeTaxKeys.rates(taxTypeId.value)),
    queryFn: () => financeTaxApi.listRates(taxTypeId.value),
    enabled: computed(() => Boolean(taxTypeId.value)),
  })
}

export function useCreateFinanceTaxRateMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateFinanceTaxRatePayload) => financeTaxApi.createRate(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeTaxKeys.all })
    },
  })
}

export function useFinanceTaxTransactionsQuery(params: Ref<FinanceTaxTransactionListParams>) {
  return useQuery({
    queryKey: computed(() => financeTaxKeys.transactions({ ...params.value })),
    queryFn: () => financeTaxApi.listTransactions(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useCreateFinanceTaxTransactionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateFinanceTaxTransactionPayload) =>
      financeTaxApi.createTransaction(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeTaxKeys.all })
    },
  })
}

export function useFinanceTaxSummaryQuery(params: Ref<FinanceTaxSummaryParams>) {
  return useQuery({
    queryKey: computed(() => financeTaxKeys.summary({ ...params.value })),
    queryFn: () => financeTaxApi.summary(params.value),
    enabled: computed(() => Boolean(params.value.start_date && params.value.end_date)),
  })
}
