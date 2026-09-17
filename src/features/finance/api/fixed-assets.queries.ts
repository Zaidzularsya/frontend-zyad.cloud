import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import {
  financeFixedAssetApi,
  type CreateFinanceAssetCategoryPayload,
  type CreateFinanceFixedAssetPayload,
  type FinanceAssetCategoryListParams,
  type FinanceFixedAssetListParams,
  type PostFinanceDepreciationPayload,
} from '@/features/finance/api/fixed-assets.api'
import { financeReportKeys } from '@/features/finance/api/reports.queries'

export const financeFixedAssetKeys = {
  all: ['finance-fixed-assets'] as const,
  categories: (params: FinanceAssetCategoryListParams) =>
    [...financeFixedAssetKeys.all, 'categories', params] as const,
  assets: (params: FinanceFixedAssetListParams) =>
    [...financeFixedAssetKeys.all, 'assets', params] as const,
  schedule: (fixedAssetId: string) =>
    [...financeFixedAssetKeys.all, 'schedule', fixedAssetId] as const,
}

export function useFinanceAssetCategoriesQuery(params: Ref<FinanceAssetCategoryListParams>) {
  return useQuery({
    queryKey: computed(() => financeFixedAssetKeys.categories({ ...params.value })),
    queryFn: () => financeFixedAssetApi.listCategories(params.value),
  })
}

export function useCreateFinanceAssetCategoryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateFinanceAssetCategoryPayload) =>
      financeFixedAssetApi.createCategory(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeFixedAssetKeys.all })
    },
  })
}

export function useFinanceFixedAssetsQuery(params: Ref<FinanceFixedAssetListParams>) {
  return useQuery({
    queryKey: computed(() => financeFixedAssetKeys.assets({ ...params.value })),
    queryFn: () => financeFixedAssetApi.listAssets(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useCreateFinanceFixedAssetMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateFinanceFixedAssetPayload) =>
      financeFixedAssetApi.createAsset(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeFixedAssetKeys.all })
      void queryClient.invalidateQueries({ queryKey: financeReportKeys.all })
    },
  })
}

export function useFinanceDepreciationScheduleQuery(fixedAssetId: Ref<string>) {
  return useQuery({
    queryKey: computed(() => financeFixedAssetKeys.schedule(fixedAssetId.value)),
    queryFn: () => financeFixedAssetApi.listSchedule(fixedAssetId.value),
    enabled: computed(() => Boolean(fixedAssetId.value)),
  })
}

export function usePostFinanceDepreciationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: PostFinanceDepreciationPayload) =>
      financeFixedAssetApi.postDepreciation(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeFixedAssetKeys.all })
      void queryClient.invalidateQueries({ queryKey: financeReportKeys.all })
    },
  })
}
