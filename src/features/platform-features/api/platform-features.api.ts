import { apiClient } from '@/lib/api-client'
import { http } from '@/lib/http'
import type { ApiEnvelope, PaginatedResponse } from '@/types/api'

export type PlatformFeatureValueType = 'boolean' | 'integer' | 'decimal' | 'string'
export type PlatformFeatureResetStrategy = 'never' | 'monthly' | 'yearly' | 'custom'

export interface PlatformFeature {
  id: string
  feature_key: string
  module: string
  name: string
  description?: string
  value_type: PlatformFeatureValueType
  unit?: string
  reset_strategy: PlatformFeatureResetStrategy
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PlatformFeatureListParams {
  page?: number
  per_page?: number
  module?: string
  is_active?: boolean
  search?: string
}

export interface CreatePlatformFeaturePayload {
  feature_key: string
  module: string
  name: string
  description?: string
  value_type: PlatformFeatureValueType
  unit?: string
  reset_strategy?: PlatformFeatureResetStrategy
  is_active?: boolean
}

export interface UpdatePlatformFeaturePayload {
  module?: string
  name?: string
  description?: string
  value_type?: PlatformFeatureValueType
  unit?: string
  reset_strategy?: PlatformFeatureResetStrategy
  is_active?: boolean
}

export const platformFeaturesApi = {
  async list(params: PlatformFeatureListParams = {}) {
    const response = await http.get<ApiEnvelope<PlatformFeature[]>>('/platform/product/features', {
      params,
    })

    return {
      data: response.data.data,
      meta: response.data.meta as PaginatedResponse<PlatformFeature>['meta'],
    }
  },

  create(payload: CreatePlatformFeaturePayload) {
    return apiClient.post<PlatformFeature, CreatePlatformFeaturePayload>(
      '/platform/product/features',
      payload,
    )
  },

  update(id: string, payload: UpdatePlatformFeaturePayload) {
    return apiClient.patch<PlatformFeature, UpdatePlatformFeaturePayload>(
      `/platform/product/features/${id}`,
      payload,
    )
  },
}
