import { http } from '@/lib/http'

/**
 * Public product-plan catalog API.
 * Reads GET /public/catalog/plans — no auth required.
 * Backend: internal/modules/product/handler/public_product_handler.go
 */

export interface PublicCatalogPlanPrice {
  billing_interval: string
  currency: string
  amount: string
}

export interface PublicCatalogPlanBenefit {
  label: string
  value?: string
}

export interface PublicCatalogPlan {
  id: string
  code: string
  name: string
  description?: string
  sort_order: number
  prices: PublicCatalogPlanPrice[]
  benefits: PublicCatalogPlanBenefit[]
}

export interface PublicListingVariant {
  product_id: string
  sku: string
  charge_type: string
  billing_frequency: string | null
  payment_timing: string
  currency: string
  base_price: string
  tax_percent: string
  price_with_tax: string
  checkout_enabled: boolean
}

export interface PublicListing {
  code: string
  name: string
  description?: string
  order: number
  variants: PublicListingVariant[]
  benefits: { label: string }[]
}

export interface PublicListingCategory {
  id: string
  name: string
  position: number
  listings: PublicListing[]
}

interface ApiEnvelope<T> {
  success: boolean
  message?: string
  data: T
}

export const publicCatalogApi = {
  listPlans: async (): Promise<PublicCatalogPlan[]> => {
    const response = await http.get<ApiEnvelope<PublicCatalogPlan[]>>('/public/catalog/plans')
    return response.data.data ?? []
  },

  /** GET /public/catalog/listings — produk platform yang dipublikasikan, per kategori. */
  listListings: async (): Promise<PublicListingCategory[]> => {
    const response = await http.get<ApiEnvelope<{ categories: PublicListingCategory[] }>>(
      '/public/catalog/listings',
    )
    return response.data.data?.categories ?? []
  },
}
