import { apiClient } from '@/lib/api-client'
import { http } from '@/lib/http'
import type { ApiEnvelope, PaginatedResponse } from '@/types/api'

export type BillingSubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'grace_period'
  | 'suspended'
  | 'canceled'
  | 'expired'

export type BillingInterval = 'monthly' | 'yearly' | 'custom'

export type BillingInvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'expired' | 'failed'

export interface BillingPlan {
  id: string
  code: string
  name: string
  description?: string
  plan_type: string
  is_public: boolean
  is_active: boolean
  sort_order: number
  metadata: Record<string, unknown>
}

export interface BillingSubscription {
  id: string
  organization_id: string
  plan_id: string
  plan?: BillingPlan | null
  status: BillingSubscriptionStatus
  billing_interval: BillingInterval
  current_period_start?: string | null
  current_period_end?: string | null
  trial_start?: string | null
  trial_end?: string | null
  cancel_at_period_end: boolean
  canceled_at?: string | null
  suspended_at?: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface BillingUsageItem {
  feature_key: string
  metric_key?: string
  used_value: string
  limit_value?: string | null
  remaining_value?: string | null
  period_start?: string | null
  period_end?: string | null
}

export interface BillingCurrentPlan {
  subscription: BillingSubscription
  usage?: BillingUsageItem[]
}

export interface BillingInvoiceItem {
  id: string
  invoice_id: string
  item_type: string
  description: string
  quantity: string
  unit_amount: string
  total_amount: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface BillingInvoice {
  id: string
  organization_id: string
  subscription_id?: string | null
  invoice_number: string
  status: BillingInvoiceStatus
  currency: string
  subtotal_amount: string
  discount_amount: string
  tax_amount: string
  total_amount: string
  due_date?: string | null
  paid_at?: string | null
  items?: BillingInvoiceItem[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface BillingInvoiceListParams {
  page?: number
  per_page?: number
  status?: BillingInvoiceStatus | ''
}

export interface RequestBillingUpgradePayload {
  plan_id: string
  billing_interval?: BillingInterval
  reason?: string
}

export interface ScheduleBillingCancellationPayload {
  reason?: string
}

export interface BillingCheckout {
  payment_url: string
  provider: string
  expires_at?: string | null
}

export const billingApi = {
  currentPlan: () => apiClient.get<BillingCurrentPlan>('/app/billing/current-plan'),

  usage: (params: {
    feature_key: string
    metric_key: string
    limit_key: string
    period_start: string
    period_end: string
  }) => apiClient.get<BillingUsageItem>('/app/billing/usage', { params }),

  invoices: async (params: BillingInvoiceListParams = {}) => {
    const response = await http.get<ApiEnvelope<BillingInvoice[]>>('/app/billing/invoices', {
      params,
    })

    return {
      data: response.data.data,
      meta: response.data.meta as PaginatedResponse<BillingInvoice>['meta'],
    }
  },

  requestUpgrade: (payload: RequestBillingUpgradePayload) =>
    apiClient.post<BillingInvoice, RequestBillingUpgradePayload>('/app/billing/upgrade', payload),

  createInvoiceCheckout: (invoiceId: string) =>
    apiClient.post<BillingCheckout, Record<string, never>>(
      `/app/billing/invoices/${invoiceId}/checkout`,
      {},
    ),

  scheduleCancellation: (payload: ScheduleBillingCancellationPayload) =>
    apiClient.post<BillingSubscription, ScheduleBillingCancellationPayload>(
      '/app/billing/cancel',
      payload,
    ),
}
