import { useQuery, useQueryClient } from '@tanstack/vue-query'

import { entitlementsApi } from './entitlements.api'

export const entitlementKeys = {
  all: ['entitlements'] as const,
  summary: () => [...entitlementKeys.all, 'summary'] as const,
}

export function useEntitlementSummaryQuery() {
  return useQuery({
    queryKey: entitlementKeys.summary(),
    queryFn: () => entitlementsApi.summary(),
    staleTime: 60_000,
    // Fail-open: 401/403 tidak perlu diulang; UI tetap berfungsi tanpa ringkasan.
    retry: false,
  })
}

// Panggil setelah mutasi create agar used/at_limit segera diperbarui.
export function useInvalidateEntitlements() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: entitlementKeys.all })
  }
}
