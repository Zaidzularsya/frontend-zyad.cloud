import { apiClient } from '@/lib/api-client'

export interface SelfServeCheckoutResult {
  invoice_url: string
  deal_id: string
}

/** Kode galat checkout self-serve (backend: internal/modules/crm/handler/self_serve_handler.go). */
export type SelfServeErrorCode =
  | 'SELF_SERVE_PRODUCT_UNAVAILABLE'
  | 'SELF_SERVE_ALREADY_SUBSCRIBED'
  | 'SELF_SERVE_IN_PROGRESS'
  | 'SELF_SERVE_STEP_FAILED'
  | 'SELF_SERVE_NOT_CONFIGURED'

export function selfServeErrorCode(error: unknown): string {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { code?: string } } }).response
    return response?.data?.code ?? ''
  }
  return ''
}

export type SubscriptionStatus = 'free' | 'awaiting_payment' | 'active' | 'overdue'

export interface SubscriptionFeature {
  feature_key: string
  value: unknown
  label: string
}

export interface SubscriptionInvoice {
  number: string
  status: string
  total: string
  period_label: string
  /** YYYY-MM-DD, kosong bila tidak ada. */
  due_date: string
  /** Link bayar/lihat publik; kosong untuk invoice void. */
  url: string
}

/** Respons GET /app/self-serve/subscription (backend: crm/handler/self_serve_handler.go). */
export interface SubscriptionView {
  status: SubscriptionStatus
  product: { name: string; sku: string; frequency: string } | null
  contract_number: string
  /** YYYY-MM-DD, kosong bila tidak ada. */
  next_invoice_date: string
  overdue_days: number
  suspend_in_days: number | null
  features: SubscriptionFeature[]
  invoices: SubscriptionInvoice[]
}

export const selfServeApi = {
  subscription: () => apiClient.get<SubscriptionView>('/app/self-serve/subscription'),

  /** Idempoten: memanggil ulang untuk produk yang sama mengembalikan link invoice yang sama. */
  checkout: (productId: string) =>
    apiClient.post<SelfServeCheckoutResult, { product_id: string }>('/app/self-serve/checkout', {
      product_id: productId,
    }),
}
