import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import {
  financeAccountApi,
  financeFiscalApi,
  type CreateFinanceAccountPayload,
  type FinanceAccountListParams,
  type UpdateFinanceAccountPayload,
} from '@/features/finance/api/coa.api'

export const financeCoAKeys = {
  all: ['finance-coa'] as const,
  types: () => [...financeCoAKeys.all, 'types'] as const,
  categories: () => [...financeCoAKeys.all, 'categories'] as const,
  accounts: () => [...financeCoAKeys.all, 'accounts'] as const,
  accountList: (params: FinanceAccountListParams) =>
    [...financeCoAKeys.accounts(), params] as const,
  accountDetail: (id: string) => [...financeCoAKeys.accounts(), 'detail', id] as const,
  fiscalYears: () => [...financeCoAKeys.all, 'fiscal-years'] as const,
}

export function useFinanceAccountTypesQuery() {
  return useQuery({
    queryKey: financeCoAKeys.types(),
    queryFn: () => financeAccountApi.listTypes(),
  })
}

export function useFinanceAccountCategoriesQuery() {
  return useQuery({
    queryKey: financeCoAKeys.categories(),
    queryFn: () => financeAccountApi.listCategories(),
  })
}

export function useFinanceAccountsQuery(params: Ref<FinanceAccountListParams>) {
  return useQuery({
    queryKey: computed(() => financeCoAKeys.accountList({ ...params.value })),
    queryFn: () => financeAccountApi.list(params.value),
  })
}

export function useFinanceAccountQuery(id: Ref<string>) {
  return useQuery({
    queryKey: computed(() => financeCoAKeys.accountDetail(id.value)),
    queryFn: () => financeAccountApi.get(id.value),
    enabled: computed(() => Boolean(id.value.trim())),
  })
}

export function useCreateFinanceAccountMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateFinanceAccountPayload) => financeAccountApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeCoAKeys.accounts() })
    },
  })
}

export function useUpdateFinanceAccountMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateFinanceAccountPayload }) =>
      financeAccountApi.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeCoAKeys.accounts() })
    },
  })
}

export function useFinanceFiscalYearsQuery() {
  return useQuery({
    queryKey: financeCoAKeys.fiscalYears(),
    queryFn: () => financeFiscalApi.list(),
  })
}

export function useCreateFinanceFiscalYearMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (year: number) => financeFiscalApi.create(year),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeCoAKeys.fiscalYears() })
    },
  })
}

export function useCloseFinanceFiscalYearMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => financeFiscalApi.closeYear(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeCoAKeys.fiscalYears() })
    },
  })
}

export function useReopenFinanceFiscalYearMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => financeFiscalApi.reopenYear(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeCoAKeys.fiscalYears() })
    },
  })
}

export function useCloseFinanceFiscalPeriodMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => financeFiscalApi.closePeriod(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeCoAKeys.fiscalYears() })
    },
  })
}

export function useReopenFinanceFiscalPeriodMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => financeFiscalApi.reopenPeriod(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeCoAKeys.fiscalYears() })
    },
  })
}
