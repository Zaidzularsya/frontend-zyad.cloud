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
}
