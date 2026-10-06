import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/types/api'

import type { BillingFrequency, ChargeType, PaymentTiming } from '../utils/pricing'

export interface CatalogCategory {
  id: string
  name: string
  position: number
}

export interface CatalogFeatureDef {
  key: string
  name: string
  module: string
  value_type: 'boolean' | 'integer' | 'decimal' | 'string'
  unit?: string
}

export interface ProductFeature {
  feature_key: string
  value: unknown
  display_label?: string
  label?: string
  position: number
}

export interface CatalogProduct {
  id: string
  category_id: string | null
  category_name?: string
  sku?: string
  name: string
  description?: string
  unit: string
  base_price: string
  tax_percent: string
  currency: string
  charge_type: ChargeType
  billing_frequency: BillingFrequency | null
  payment_timing: PaymentTiming
  is_active: boolean
  // Hanya terisi untuk katalog platform; org lain selalu false/[].
  is_public?: boolean
  listing_code?: string | null
  listing_order?: number
  features?: ProductFeature[]
  created_at: string
  updated_at: string
}

export interface ProductPayload {
  category_id?: string
  sku?: string
  name: string
  description?: string
  unit?: string
  base_price?: string
  tax_percent?: string
  // Atribut harga selalu dikirim utuh (backend menolak sebagian).
  charge_type?: ChargeType
  billing_frequency?: BillingFrequency | null
  payment_timing?: PaymentTiming
  is_active?: boolean
  // Katalog platform saja; org lain yang mengirim ini ditolak 422.
  is_public?: boolean
  listing_code?: string
  listing_order?: number
  features?: Omit<ProductFeature, 'label'>[]
}

export interface ProductListParams {
  page: number
  per_page: number
  q?: string
  category_id?: string
  is_active?: boolean
}

export interface CategoryPayload {
  name?: string
  position?: number
}

export const catalogApi = {
  products: async (params: ProductListParams) => {
    const response = await http.get<{
      success: boolean
      data: CatalogProduct[]
      meta: PaginatedResponse<CatalogProduct>['meta']
    }>('/app/catalog/products', {
      params: {
        ...params,
        is_active: params.is_active === undefined ? undefined : String(params.is_active),
      },
    })

    return { data: response.data.data, meta: response.data.meta }
  },

  product: (id: string) =>
    http
      .get<{ success: boolean; data: CatalogProduct }>(`/app/catalog/products/${id}`)
      .then((response) => response.data.data),

  createProduct: (payload: ProductPayload) =>
    http
      .post<{ success: boolean; data: CatalogProduct }>('/app/catalog/products', payload)
      .then((response) => response.data.data),

  updateProduct: (id: string, payload: Partial<ProductPayload>) =>
    http
      .patch<{ success: boolean; data: CatalogProduct }>(`/app/catalog/products/${id}`, payload)
      .then((response) => response.data.data),

  deleteProduct: (id: string) => http.delete(`/app/catalog/products/${id}`),

  features: () =>
    http
      .get<{ success: boolean; data: CatalogFeatureDef[] }>('/app/catalog/features')
      .then((response) => response.data.data),

  categories: () =>
    http
      .get<{ success: boolean; data: CatalogCategory[] }>('/app/catalog/categories')
      .then((response) => response.data.data),

  createCategory: (payload: { name: string; position?: number }) =>
    http
      .post<{ success: boolean; data: CatalogCategory }>('/app/catalog/categories', payload)
      .then((response) => response.data.data),

  updateCategory: (id: string, payload: CategoryPayload) =>
    http
      .patch<{ success: boolean; data: CatalogCategory }>(`/app/catalog/categories/${id}`, payload)
      .then((response) => response.data.data),

  deleteCategory: (id: string) => http.delete(`/app/catalog/categories/${id}`),
}
