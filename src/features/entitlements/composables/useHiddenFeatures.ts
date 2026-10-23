import { useEntitlementSummaryQuery } from '../api/entitlements.queries'

// Same fail-open semantics as useEntitlement: nothing is hidden while the summary is
// loading or errored; once loaded, a key that is absent or `hidden` counts as hidden.
// The returned function reads reactive query state, so call it inside a computed/render.
export function useHiddenFeatures() {
  const query = useEntitlementSummaryQuery()

  return (featureKey: string): boolean => {
    const data = query.data.value
    if (query.isError.value || !Array.isArray(data)) return false
    const entry = data.find((item) => item.feature_key === featureKey)
    return !entry || entry.state === 'hidden'
  }
}
