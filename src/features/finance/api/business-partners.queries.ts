import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import {
  financeBusinessPartnerApi,
  type CreateFinanceBusinessPartnerPayload,
  type FinanceBusinessPartnerListParams,
  type UpdateFinanceBusinessPartnerPayload,
} from '@/features/finance/api/business-partners.api'

export const financeBusinessPartnerKeys = {
  all: ['finance-business-partners'] as const,
  list: (params: FinanceBusinessPartnerListParams) =>
    [...financeBusinessPartnerKeys.all, 'list', params] as const,
}

export function useFinanceBusinessPartnersQuery(params: Ref<FinanceBusinessPartnerListParams>) {
  return useQuery({
    queryKey: computed(() => financeBusinessPartnerKeys.list({ ...params.value })),
    queryFn: () => financeBusinessPartnerApi.list(params.value),
  })
}

export function useCreateFinanceBusinessPartnerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateFinanceBusinessPartnerPayload) =>
      financeBusinessPartnerApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeBusinessPartnerKeys.all })
    },
  })
}

export function useUpdateFinanceBusinessPartnerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateFinanceBusinessPartnerPayload }) =>
      financeBusinessPartnerApi.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeBusinessPartnerKeys.all })
    },
  })
}
