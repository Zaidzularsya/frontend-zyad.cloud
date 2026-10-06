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

export const selfServeApi = {
  /** Idempoten: memanggil ulang untuk produk yang sama mengembalikan link invoice yang sama. */
  checkout: (productId: string) =>
    apiClient.post<SelfServeCheckoutResult, { product_id: string }>('/app/self-serve/checkout', {
      product_id: productId,
    }),
}
