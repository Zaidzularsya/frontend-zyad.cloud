import { http } from '@/lib/http'

import type { PublicListingCategory } from './public-catalog.api'

/**
 * Checkout publik di domain tenant. Tenant selalu di-resolve backend dari Host;
 * klien tidak pernah mengirim organization id.
 * Backend: crm/handler/tenant_checkout_handler.go, catalog/handler/public_listing_handler.go
 */

interface ApiEnvelope<T> {
  success: boolean
  message?: string
  data: T
}

export interface TenantCheckoutResult {
  invoice_url: string
}

export const tenantCheckoutApi = {
  /** GET /public/tenant-catalog — kartu produk publik tenant pemilik host. */
  listCatalog: async (): Promise<PublicListingCategory[]> => {
    const response =
      await http.get<ApiEnvelope<{ categories: PublicListingCategory[] }>>('/public/tenant-catalog')
    return response.data.data?.categories ?? []
  },

  /** POST /public/tenant-checkout — idempoten; tidak menerbitkan sesi login. */
  checkout: async (googleCredential: string, productId: string): Promise<TenantCheckoutResult> => {
    const response = await http.post<ApiEnvelope<TenantCheckoutResult>>('/public/tenant-checkout', {
      google_credential: googleCredential,
      product_id: productId,
    })
    return response.data.data
  },
}

export interface TenantCheckoutError {
  status: number
  code: string
}

export function tenantCheckoutError(error: unknown): TenantCheckoutError {
  const response = (
    error as {
      response?: { status?: number; data?: { code?: string; error?: { code?: string } } }
    } | null
  )?.response
  return {
    status: response?.status ?? 0,
    code: response?.data?.code ?? response?.data?.error?.code ?? '',
  }
}

/** Pesan netral berbahasa Indonesia; tidak membocorkan detail internal tenant. */
export function tenantCheckoutMessage(error: unknown): string {
  const { status, code } = tenantCheckoutError(error)
  if (status === 401) {
    return 'Verifikasi akun Google gagal. Pastikan email Google Anda terverifikasi, lalu coba lagi.'
  }
  if (status === 404 || status === 422) return 'Paket ini tidak tersedia.'
  if (status === 409) {
    if (code === 'SELF_SERVE_IN_PROGRESS') return 'Sedang diproses, coba lagi sesaat.'
    if (code === 'SELF_SERVE_ALREADY_SUBSCRIBED') return 'Anda sudah berlangganan paket ini.'
    // COMPANY_ALREADY_LINKED / WORKSPACE_ALREADY_LINKED dan konflik lain.
    return 'Tidak dapat memproses, hubungi penjual.'
  }
  if (status === 429) return 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.'
  return 'Pembayaran belum bisa disiapkan. Coba lagi.'
}
