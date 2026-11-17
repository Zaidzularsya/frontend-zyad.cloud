import { computed } from 'vue'

import { useEntitlementSummaryQuery } from '@/features/entitlements/api/entitlements.queries'

// Fail-closed: fitur dianggap mati sampai ringkasan entitlement dimuat dan fitur tidak tersembunyi.
export function useMikrotikEnabled() {
  const summary = useEntitlementSummaryQuery()
  return computed(() => {
    const data = summary.data.value
    if (!Array.isArray(data)) return false
    const entry = data.find((item) => item.feature_key === 'mikrotik.enabled')
    return Boolean(entry) && entry?.state !== 'hidden'
  })
}
