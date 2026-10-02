import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import {
  catalogApi,
  type CategoryPayload,
  type ProductListParams,
  type ProductPayload,
} from '@/features/catalog/api/catalog.api'

export const catalogKeys = {
  all: ['catalog'] as const,
  products: (params: ProductListParams) => [...catalogKeys.all, 'products', params] as const,
  product: (id: string) => [...catalogKeys.all, 'product', id] as const,
  categories: () => [...catalogKeys.all, 'categories'] as const,
}

export function useProductsQuery(params: Ref<ProductListParams>) {
  return useQuery({
    queryKey: computed(() => catalogKeys.products(params.value)),
    queryFn: () => catalogApi.products(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: catalogKeys.categories(),
    queryFn: () => catalogApi.categories(),
  })
}

function useInvalidateCatalog() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: catalogKeys.all })
  }
}

export function useSaveProductMutation() {
  const invalidate = useInvalidateCatalog()
  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: ProductPayload }) =>
      id ? catalogApi.updateProduct(id, payload) : catalogApi.createProduct(payload),
    onSuccess: invalidate,
  })
}

export function useDeleteProductMutation() {
  const invalidate = useInvalidateCatalog()
  return useMutation({
    mutationFn: (id: string) => catalogApi.deleteProduct(id),
    onSuccess: invalidate,
  })
}

export function useSaveCategoryMutation() {
  const invalidate = useInvalidateCatalog()
  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: CategoryPayload }) =>
      id
        ? catalogApi.updateCategory(id, payload)
        : catalogApi.createCategory({ name: payload.name ?? '', position: payload.position }),
    onSuccess: invalidate,
  })
}

export function useDeleteCategoryMutation() {
  const invalidate = useInvalidateCatalog()
  return useMutation({
    mutationFn: (id: string) => catalogApi.deleteCategory(id),
    onSuccess: invalidate,
  })
}
