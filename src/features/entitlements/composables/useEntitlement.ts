import { computed, toValue, type MaybeRefOrGetter } from 'vue'

import { useEntitlementSummaryQuery } from '../api/entitlements.queries'

// Fail-open: selama ringkasan belum termuat atau gagal dimuat, jangan menyembunyikan
// menu atau memblokir tombol. Backend tetap menegakkan batas yang sebenarnya.
export function useEntitlement(featureKey: MaybeRefOrGetter<string>) {
  const query = useEntitlementSummaryQuery()

  const loaded = computed(() => !query.isError.value && Array.isArray(query.data.value))
  const item = computed(() =>
    loaded.value
      ? query.data.value!.find((entry) => entry.feature_key === toValue(featureKey))
      : undefined,
  )
  const state = computed(() => (loaded.value ? (item.value?.state ?? 'hidden') : 'unlimited'))

  return {
    item,
    state,
    isLoading: computed(() => query.isLoading.value),
    isHidden: computed(() => loaded.value && state.value === 'hidden'),
    isUnlimited: computed(() => state.value === 'unlimited'),
    atLimit: computed(() => item.value?.state === 'quota' && item.value.at_limit === true),
    limit: computed(() => item.value?.limit ?? undefined),
    used: computed(() => item.value?.used ?? undefined),
    remaining: computed(() => item.value?.remaining ?? undefined),
  }
}
