<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { selfServeApi } from '@/features/customer/api/self-serve.api'

import { useEntitlementSummaryQuery } from '../api/entitlements.queries'
import { groupUsage } from '../utils/usage-groups'
import { upgradeTarget } from '../utils/upgrade'

const summary = useEntitlementSummaryQuery()

// Nama paket hanya pemanis: bila gagal dimuat, tampilkan judul generik.
const subscription = useQuery({
  queryKey: ['self-serve', 'subscription'],
  queryFn: () => selfServeApi.subscription(),
  staleTime: 60_000,
  retry: false,
})

const groups = computed(() => groupUsage(summary.data.value ?? []))
const hasMonthly = computed(() =>
  (summary.data.value ?? []).some((i) => i.state === 'quota' && i.reset_strategy === 'monthly'),
)
const title = computed(() => {
  const name = subscription.data.value?.product?.name
  return name ? `Paket ${name}` : 'Paket Anda'
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Pemakaian Paket" description="Pemakaian kuota workspace Anda saat ini." />

    <BaseCard>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="font-semibold text-gray-900 dark:text-gray-100" data-testid="usage-plan">
            {{ title }}
          </p>
          <p v-if="hasMonthly" class="text-xs text-gray-500">
            Kuota per bulan direset tiap tanggal 1
          </p>
        </div>
        <RouterLink
          :to="upgradeTarget()"
          class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Upgrade plan
        </RouterLink>
      </div>
    </BaseCard>

    <p v-if="summary.isLoading.value" class="text-sm text-gray-500" data-testid="usage-loading">
      Memuat pemakaian...
    </p>
    <p
      v-else-if="summary.isError.value"
      role="alert"
      class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200"
    >
      Pemakaian paket belum dapat dimuat. Coba muat ulang halaman beberapa saat lagi.
    </p>
    <template v-else>
      <BaseCard v-for="group in groups" :key="group.title">
        <h2 class="mb-3 font-semibold text-gray-900 dark:text-gray-100">{{ group.title }}</h2>
        <ul class="space-y-3 text-sm">
          <li v-for="row in group.rows" :key="row.key" :data-testid="`usage-row-${row.key}`">
            <div class="flex items-center justify-between gap-3">
              <span class="text-gray-700 dark:text-gray-300">{{ row.label }}</span>
              <span class="text-gray-500">
                {{ row.format }}
                <b v-if="row.atLimit" class="ml-1 text-red-600 dark:text-red-400">penuh</b>
              </span>
            </div>
            <div
              v-if="row.percent !== undefined"
              role="progressbar"
              :aria-label="`Pemakaian ${row.label}`"
              :aria-valuenow="row.percent"
              aria-valuemin="0"
              aria-valuemax="100"
              class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
            >
              <div
                class="h-full rounded-full"
                :class="row.atLimit ? 'bg-red-500' : 'bg-brand-500'"
                :style="{ width: `${row.percent}%` }"
              />
            </div>
          </li>
        </ul>
      </BaseCard>
      <p class="text-xs text-gray-500">Product: tanpa batas</p>
    </template>
  </div>
</template>
