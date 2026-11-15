<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { useRouterStatsQuery } from '@/features/mikrotik/api/mikrotik.queries'
import { apiErrorCode, routerActionError } from '@/features/mikrotik/utils/errors'
import { formatBytes, formatUptime, relativeTime } from '@/features/mikrotik/utils/format'

// Data live: setiap muat login ke router, jadi hanya untuk router terpilih dan tanpa auto-refresh.
const props = defineProps<{ routerId: string; secretsTotal?: number }>()

const query = useRouterStatsQuery(computed(() => props.routerId))
const stats = computed(() => query.data.value)

const rateLimited = computed(() => {
  const error = query.error.value as { response?: { status?: number } } | null
  return error?.response?.status === 429 || apiErrorCode(error) === 'RATE_LIMITED'
})
const errorReason = computed(() => routerActionError(query.error.value))

// "Diperbarui X detik lalu" harus tetap jujur selama halaman terbuka.
const now = ref(Date.now())
const ticker = setInterval(() => (now.value = Date.now()), 10_000)
onBeforeUnmount(() => clearInterval(ticker))
const updated = computed(() =>
  stats.value ? relativeTime(stats.value.fetched_at, Math.max(now.value, Date.now())) : '',
)

const cpu = computed(() => stats.value?.cpu_load ?? null)
const memory = computed(() => {
  const total = stats.value?.memory_total
  const free = stats.value?.memory_free
  if (total == null || free == null || total <= 0) return null
  const used = total - free
  return {
    used: formatBytes(used),
    total: formatBytes(total),
    pct: Math.min(100, Math.max(0, Math.round((used / total) * 100))),
  }
})
const model = computed(() =>
  [stats.value?.board_name, stats.value?.architecture].filter(Boolean).join(' · '),
)

function refresh() {
  void query.refetch()
}
</script>

<template>
  <BaseCard class="sm:col-span-2">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="font-semibold">Kondisi router saat ini</h3>
      <div v-if="stats && !query.isError.value" class="flex items-center gap-3">
        <span class="text-xs text-gray-500 dark:text-gray-400">Diperbarui {{ updated }}</span>
        <BaseButton variant="outline" :disabled="query.isFetching.value" @click="refresh">
          {{ query.isFetching.value ? 'Memuat...' : 'Segarkan' }}
        </BaseButton>
      </div>
    </div>

    <div
      v-if="query.isPending.value"
      data-state="loading"
      class="mt-4 space-y-3"
      aria-busy="true"
      aria-label="Memuat data router"
    >
      <div class="h-10 w-48 rounded-lg bg-gray-100 motion-safe:animate-pulse dark:bg-gray-800" />
      <div class="grid gap-3 sm:grid-cols-2">
        <div
          v-for="n in 4"
          :key="n"
          class="h-16 rounded-lg bg-gray-100 motion-safe:animate-pulse dark:bg-gray-800"
        />
      </div>
    </div>

    <div
      v-else-if="query.isError.value"
      data-state="error"
      class="mt-4 rounded-lg bg-red-50 p-4 text-sm dark:bg-red-950"
      role="alert"
    >
      <template v-if="rateLimited">
        <p class="font-medium text-red-800 dark:text-red-200">
          Terlalu sering, coba lagi sebentar.
        </p>
      </template>
      <template v-else>
        <p class="font-medium text-red-800 dark:text-red-200">Router tidak bisa dihubungi.</p>
        <p class="mt-1 text-red-700 dark:text-red-300">{{ errorReason }}</p>
      </template>
      <BaseButton
        class="mt-3"
        variant="outline"
        :disabled="query.isFetching.value"
        @click="refresh"
      >
        Coba lagi
      </BaseButton>
    </div>

    <div v-else-if="stats" data-state="ready" class="mt-4">
      <p class="text-sm text-gray-500 dark:text-gray-400">Sesi PPPoE aktif</p>
      <p class="mt-1 text-gray-700 dark:text-gray-300">
        <span class="text-4xl font-bold tabular-nums text-gray-900 dark:text-white">{{
          stats.ppp_active ?? '-'
        }}</span>
        online<template v-if="secretsTotal !== undefined">
          dari <span class="tabular-nums">{{ secretsTotal }}</span> secret</template
        >
      </p>

      <dl class="mt-5 grid gap-x-6 gap-y-4 border-t pt-4 sm:grid-cols-2 dark:border-gray-800">
        <div data-stat="identity" class="min-w-0">
          <dt class="text-xs text-gray-500 dark:text-gray-400">Identity &amp; model</dt>
          <dd class="mt-0.5 truncate font-medium">{{ stats.identity || '-' }}</dd>
          <dd class="truncate text-sm text-gray-600 dark:text-gray-300">{{ model || '-' }}</dd>
        </div>
        <div data-stat="uptime">
          <dt class="text-xs text-gray-500 dark:text-gray-400">Uptime</dt>
          <dd class="mt-0.5 font-medium tabular-nums">
            {{ stats.uptime ? formatUptime(stats.uptime) : '-' }}
          </dd>
          <dd v-if="stats.version" class="text-sm text-gray-600 dark:text-gray-300">
            RouterOS {{ stats.version }}
          </dd>
        </div>
        <div data-stat="cpu">
          <dt class="text-xs text-gray-500 dark:text-gray-400">CPU</dt>
          <dd class="mt-0.5 font-medium tabular-nums">{{ cpu === null ? '-' : `${cpu}%` }}</dd>
          <dd v-if="cpu !== null" class="mt-1.5 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              class="h-2 rounded-full bg-brand-500"
              :style="{ width: `${Math.min(100, Math.max(0, cpu))}%` }"
              aria-hidden="true"
            />
          </dd>
        </div>
        <div data-stat="memory">
          <dt class="text-xs text-gray-500 dark:text-gray-400">Memori terpakai</dt>
          <dd class="mt-0.5 font-medium tabular-nums">
            {{ memory ? `${memory.used} dari ${memory.total}` : '-' }}
          </dd>
          <dd v-if="memory" class="mt-1.5 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              class="h-2 rounded-full bg-brand-500"
              :style="{ width: `${memory.pct}%` }"
              aria-hidden="true"
            />
          </dd>
        </div>
      </dl>
    </div>
  </BaseCard>
</template>
