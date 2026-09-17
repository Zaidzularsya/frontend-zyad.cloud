import { http } from '@/lib/http'
import { apiClient } from '@/lib/api-client'
import type { ApiEnvelope, PaginatedResponse } from '@/types/api'

export interface FinanceAssetCategory {
  id: string
  code: string
  name: string
  asset_account_id: string
  asset_account_code?: string
  asset_account_name?: string
  accumulated_depreciation_account_id: string
  accumulated_depreciation_account_code?: string
  accumulated_depreciation_account_name?: string
  depreciation_expense_account_id: string
  depreciation_expense_account_code?: string
  depreciation_expense_account_name?: string
  default_useful_life_months?: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateFinanceAssetCategoryPayload {
  code: string
  name: string
  asset_account_id: string
  accumulated_depreciation_account_id: string
  depreciation_expense_account_id: string
  default_useful_life_months?: number
}

export interface FinanceAssetCategoryListParams {
  include_inactive?: boolean
}

export type FinanceFixedAssetStatus = 'active' | 'fully_depreciated'

export interface FinanceFixedAsset {
  id: string
  asset_category_id: string
  asset_category_code?: string
  asset_category_name?: string
  asset_code: string
  asset_name: string
  acquisition_date: string
  acquisition_cost: string
  salvage_value: string
  useful_life_months: number
  description?: string
  status: FinanceFixedAssetStatus
  acquisition_journal_entry_id: string
  accumulated_depreciation: string
  book_value: string
  created_at: string
  updated_at: string
}

export interface CreateFinanceFixedAssetPayload {
  asset_category_id: string
  asset_code: string
  asset_name: string
  acquisition_date: string
  acquisition_cost: string
  salvage_value?: string
  useful_life_months: number
  description?: string
  contra_account_id: string
}

export interface FinanceFixedAssetListParams {
  asset_category_id?: string
  status?: FinanceFixedAssetStatus | ''
  page?: number
  per_page?: number
}

export type FinanceDepreciationStatus = 'pending' | 'posted'

export interface FinanceDepreciationScheduleRow {
  id: string
  sequence_number: number
  period_date: string
  depreciation_amount: string
  status: FinanceDepreciationStatus
  journal_entry_id?: string
  posted_at?: string
}

export interface PostFinanceDepreciationPayload {
  as_of_date: string
}

export interface PostFinanceDepreciationResultItem {
  schedule_id: string
  asset_code: string
  period_date: string
  status: 'posted' | 'failed'
  reason?: string
}

export interface PostFinanceDepreciationResult {
  posted_count: number
  failed_count: number
  items: PostFinanceDepreciationResultItem[]
}

export const financeFixedAssetApi = {
  listCategories(params: FinanceAssetCategoryListParams = {}) {
    return apiClient.get<FinanceAssetCategory[]>('/platform/finance/asset-categories', { params })
  },
  createCategory(payload: CreateFinanceAssetCategoryPayload) {
    return apiClient.post<FinanceAssetCategory, CreateFinanceAssetCategoryPayload>(
      '/platform/finance/asset-categories',
      payload,
    )
  },
  async listAssets(params: FinanceFixedAssetListParams = {}) {
    const response = await http.get<ApiEnvelope<FinanceFixedAsset[]>>(
      '/platform/finance/fixed-assets',
      {
        params,
      },
    )
    return {
      data: response.data.data,
      meta: response.data.meta as PaginatedResponse<FinanceFixedAsset>['meta'],
    }
  },
  createAsset(payload: CreateFinanceFixedAssetPayload) {
    return apiClient.post<FinanceFixedAsset, CreateFinanceFixedAssetPayload>(
      '/platform/finance/fixed-assets',
      payload,
    )
  },
  listSchedule(fixedAssetId: string) {
    return apiClient.get<FinanceDepreciationScheduleRow[]>(
      `/platform/finance/fixed-assets/${fixedAssetId}/depreciation-schedule`,
    )
  },
  postDepreciation(payload: PostFinanceDepreciationPayload) {
    return apiClient.post<PostFinanceDepreciationResult, PostFinanceDepreciationPayload>(
      '/platform/finance/fixed-assets/post-depreciation',
      payload,
    )
  },
}
