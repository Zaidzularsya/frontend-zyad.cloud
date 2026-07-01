import { apiClient } from '@/lib/api-client'
import { http } from '@/lib/http'
import type { ApiEnvelope, PaginatedResponse } from '@/types/api'

export type PlatformBillingPlanType = 'free' | 'trial' | 'paid' | 'enterprise'
export type PlatformBillingInterval = 'monthly' | 'yearly' | 'one_time' | 'custom'
export type PlatformBillingFeatureValueType = 'boolean' | 'integer' | 'decimal' | 'string'
export type PlatformBillingResetStrategy = 'never' | 'monthly' | 'yearly' | 'custom'

export interface PlatformBillingPlanPrice {
  id: string
  plan_id: string
  billing_interval: PlatformBillingInterval
  currency: string
  amount: string
  is_active: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface PlatformBillingPlan {
  id: string
  code: string
  name: string
  description?: string
  plan_type: PlatformBillingPlanType
  is_public: boolean
  is_active: boolean
  sort_order: number
  metadata: Record<string, unknown>
  prices?: PlatformBillingPlanPrice[]
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface PlatformBillingFeature {
  id: string
  feature_key: string
  module: string
  name: string
  description?: string
  value_type: PlatformBillingFeatureValueType
  unit?: string
  reset_strategy: PlatformBillingResetStrategy
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PlatformBillingPlanEntitlement {
  id: string
  plan_id: string
  feature_id: string
  feature_key: string
  value_bool?: boolean | null
  value_int?: number | null
  value_decimal?: string | null
  value_string?: string | null
  limits: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface PlatformBillingPlanListParams {
  page?: number
  per_page?: number
  type?: PlatformBillingPlanType | ''
  is_public?: boolean
  is_active?: boolean
  include_deleted?: boolean
  search?: string
  sort?: string
  direction?: 'asc' | 'desc'
}

export interface PlatformBillingFeatureListParams {
  page?: number
  per_page?: number
  module?: string
  is_active?: boolean
  search?: string
}

export interface PlatformBillingPlanPricePayload {
  billing_interval: PlatformBillingInterval
  currency?: string
  amount: string
  is_active?: boolean
  metadata?: Record<string, unknown>
}

export interface CreatePlatformBillingPlanPayload {
  code: string
  name: string
  description?: string
  plan_type: PlatformBillingPlanType
  is_public?: boolean
  is_active?: boolean
  sort_order?: number
  metadata?: Record<string, unknown>
  prices?: PlatformBillingPlanPricePayload[]
}

export interface UpdatePlatformBillingPlanPayload {
  name?: string
  description?: string
  plan_type?: PlatformBillingPlanType
  is_public?: boolean
  is_active?: boolean
  sort_order?: number
  metadata?: Record<string, unknown>
}

export interface UpdatePlatformBillingPlanPricePayload {
  billing_interval?: PlatformBillingInterval
  currency?: string
  amount?: string
  is_active?: boolean
  metadata?: Record<string, unknown>
}

export interface ReplacePlatformBillingPlanEntitlementsPayload {
  entitlements: Array<{
    feature_key: string
    value_bool?: boolean
    value_int?: number
    value_decimal?: string
    value_string?: string
    limits?: Record<string, unknown>
  }>
}

export const platformBillingApi = {
  async listPlans(params: PlatformBillingPlanListParams = {}) {
    const response = await http.get<ApiEnvelope<PlatformBillingPlan[]>>('/platform/billing/plans', {
      params,
    })

    return {
      data: response.data.data,
      meta: response.data.meta as PaginatedResponse<PlatformBillingPlan>['meta'],
    }
  },

  getPlan(id: string) {
    return apiClient.get<PlatformBillingPlan>(`/platform/billing/plans/${id}`)
  },

  createPlan(payload: CreatePlatformBillingPlanPayload) {
    return apiClient.post<PlatformBillingPlan, CreatePlatformBillingPlanPayload>(
      '/platform/billing/plans',
      payload,
    )
  },

  updatePlan(id: string, payload: UpdatePlatformBillingPlanPayload) {
    return apiClient.patch<PlatformBillingPlan, UpdatePlatformBillingPlanPayload>(
      `/platform/billing/plans/${id}`,
      payload,
    )
  },

  deletePlan(id: string) {
    return apiClient.delete<void>(`/platform/billing/plans/${id}`)
  },

  listPlanPrices(id: string, includeDeleted = false) {
    return apiClient.get<PlatformBillingPlanPrice[]>(`/platform/billing/plans/${id}/prices`, {
      params: { include_deleted: includeDeleted },
    })
  },

  createPlanPrice(id: string, payload: PlatformBillingPlanPricePayload) {
    return apiClient.post<PlatformBillingPlanPrice, PlatformBillingPlanPricePayload>(
      `/platform/billing/plans/${id}/prices`,
      payload,
    )
  },

  updatePlanPrice(id: string, priceId: string, payload: UpdatePlatformBillingPlanPricePayload) {
    return apiClient.patch<PlatformBillingPlanPrice, UpdatePlatformBillingPlanPricePayload>(
      `/platform/billing/plans/${id}/prices/${priceId}`,
      payload,
    )
  },

  deletePlanPrice(id: string, priceId: string) {
    return apiClient.delete<void>(`/platform/billing/plans/${id}/prices/${priceId}`)
  },

  async listFeatures(params: PlatformBillingFeatureListParams = {}) {
    const response = await http.get<ApiEnvelope<PlatformBillingFeature[]>>(
      '/platform/billing/features',
      {
        params,
      },
    )

    return {
      data: response.data.data,
      meta: response.data.meta as PaginatedResponse<PlatformBillingFeature>['meta'],
    }
  },

  listPlanEntitlements(id: string) {
    return apiClient.get<PlatformBillingPlanEntitlement[]>(
      `/platform/billing/plans/${id}/entitlements`,
    )
  },

  replacePlanEntitlements(id: string, payload: ReplacePlatformBillingPlanEntitlementsPayload) {
    return apiClient.put<
      PlatformBillingPlanEntitlement[],
      ReplacePlatformBillingPlanEntitlementsPayload
    >(`/platform/billing/plans/${id}/entitlements`, payload)
  },
}
