import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { settlementApi, type PageParams } from '@/features/settlement/api/settlement.api'
import type { EntryPayload } from '@/features/settlement/utils/settlement'

export const settlementKeys = {
  all: ['settlement'] as const,
  balances: (params: object) => [...settlementKeys.all, 'balances', params] as const,
  entries: (orgId: string, params: object) =>
    [...settlementKeys.all, 'entries', orgId, params] as const,
  ownBalance: () => [...settlementKeys.all, 'own-balance'] as const,
  ownEntries: (params: object) => [...settlementKeys.all, 'own-entries', params] as const,
}

export function useOrgBalancesQuery(params: Ref<PageParams>) {
  return useQuery({
    queryKey: computed(() => settlementKeys.balances(params.value)),
    queryFn: () => settlementApi.platform.list(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useOrgEntriesQuery(orgId: Ref<string | null>, params: Ref<PageParams>) {
  return useQuery({
    queryKey: computed(() => settlementKeys.entries(orgId.value ?? '', params.value)),
    queryFn: () => settlementApi.platform.entries(orgId.value as string, params.value),
    enabled: computed(() => !!orgId.value),
    placeholderData: keepPreviousData,
  })
}

export function useRecordEntryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orgId, payload }: { orgId: string; payload: EntryPayload }) =>
      settlementApi.platform.record(orgId, payload),
    // Satu entri mengubah saldo di daftar dan riwayat: segarkan semuanya.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settlementKeys.all }),
  })
}

export function useOwnBalanceQuery() {
  return useQuery({ queryKey: settlementKeys.ownBalance(), queryFn: settlementApi.own.balance })
}

export function useOwnEntriesQuery(params: Ref<PageParams>) {
  return useQuery({
    queryKey: computed(() => settlementKeys.ownEntries(params.value)),
    queryFn: () => settlementApi.own.entries(params.value),
    placeholderData: keepPreviousData,
  })
}
