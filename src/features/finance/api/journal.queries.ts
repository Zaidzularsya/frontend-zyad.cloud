import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import {
  financeJournalApi,
  type CreateFinanceJournalEntryPayload,
  type FinanceJournalListParams,
  type ReverseFinanceJournalEntryPayload,
} from '@/features/finance/api/journal.api'
import { financeReportKeys } from '@/features/finance/api/reports.queries'

export const financeJournalKeys = {
  all: ['finance-journal'] as const,
  list: (params: FinanceJournalListParams) => [...financeJournalKeys.all, 'list', params] as const,
  detail: (id: string) => [...financeJournalKeys.all, 'detail', id] as const,
}

export function useFinanceJournalListQuery(params: Ref<FinanceJournalListParams>) {
  return useQuery({
    queryKey: computed(() => financeJournalKeys.list({ ...params.value })),
    queryFn: () => financeJournalApi.list(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useFinanceJournalDetailQuery(id: Ref<string>) {
  return useQuery({
    queryKey: computed(() => financeJournalKeys.detail(id.value)),
    queryFn: () => financeJournalApi.get(id.value),
    enabled: computed(() => Boolean(id.value.trim())),
  })
}

export function useCreateFinanceJournalEntryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateFinanceJournalEntryPayload) => financeJournalApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeJournalKeys.all })
      void queryClient.invalidateQueries({ queryKey: financeReportKeys.all })
    },
  })
}

export function useReverseFinanceJournalEntryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReverseFinanceJournalEntryPayload }) =>
      financeJournalApi.reverse(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeJournalKeys.all })
      void queryClient.invalidateQueries({ queryKey: financeReportKeys.all })
    },
  })
}
