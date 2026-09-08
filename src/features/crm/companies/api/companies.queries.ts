import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import {
  companiesApi,
  type CompanyListParams,
  type CompanyPayload,
} from '@/features/crm/companies/api/companies.api'

export const companyKeys = {
  all: ['crm', 'companies'] as const,
  lists: () => [...companyKeys.all, 'list'] as const,
  list: (params: CompanyListParams) => [...companyKeys.lists(), params] as const,
  details: () => [...companyKeys.all, 'detail'] as const,
  detail: (id: string) => [...companyKeys.details(), id] as const,
}

export function useCompaniesQuery(params: Ref<CompanyListParams>) {
  return useQuery({
    queryKey: computed(() => companyKeys.list(params.value)),
    queryFn: () => companiesApi.list(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useCreateCompanyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CompanyPayload) => companiesApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: companyKeys.all })
    },
  })
}

export function useUpdateCompanyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CompanyPayload> }) =>
      companiesApi.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: companyKeys.all })
    },
  })
}

export function useDeleteCompanyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => companiesApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: companyKeys.all })
    },
  })
}

export function useRestoreCompanyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => companiesApi.restore(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: companyKeys.all })
    },
  })
}
