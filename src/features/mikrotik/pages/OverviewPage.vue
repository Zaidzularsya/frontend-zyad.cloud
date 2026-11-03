<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import {
  useControlQuery,
  useOnboardingQuery,
  useRoutersQuery,
  useTaskSummaryQuery,
  useTasksQuery,
} from '@/features/mikrotik/api/mikrotik.queries'
import OnboardingChecklist, {
  type OnboardingStepKey,
} from '@/features/mikrotik/components/OnboardingChecklist.vue'
import ControlPage from '@/features/mikrotik/pages/ControlPage.vue'
import type { TaskListParams } from '@/features/mikrotik/types'
import { controlPermissions } from '@/features/mikrotik/utils/control-permissions'
import { taskErrorAction } from '@/features/mikrotik/utils/errors'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const onboardingQuery = useOnboardingQuery()
const summaryQuery = useTaskSummaryQuery()
const failedParams = ref<TaskListParams>({ status: 'failed', limit: 5 })
const failedQuery = useTasksQuery(failedParams)
const routersQuery = useRoutersQuery()

const auth = useAuthStore()
const canReadControl = computed(() => controlPermissions(auth.user?.permissions ?? []).canRead)

const status = computed(() => onboardingQuery.data.value)
// Mode kendali hanya dibaca setelah onboarding lengkap dan hanya oleh yang berhak.
const controlEnabled = computed(() => canReadControl.value && Boolean(status.value?.complete))
const controlQuery = useControlQuery(controlEnabled)
const controlMode = computed(() => controlQuery.data.value?.mode)
// Selama kueri kendali memuat atau gagal, tampilan ringkasan lama tetap dipakai.
const showControl = computed(() => controlMode.value === 'active' || controlMode.value === 'paused')
const showLaunchCta = computed(
  () => controlMode.value === 'simulation' || controlMode.value === 'pilot',
)

const counts = computed(() => summaryQuery.data.value?.counts ?? {})
const failed = computed(() => (failedQuery.data.value?.data ?? []).slice(0, 5))

const STEP_ROUTE: Record<OnboardingStepKey, string> = {
  router: 'mikrotik-routers',
  setup: 'mikrotik-routers',
  secrets: 'mikrotik-accounts',
  products: 'crm-products',
  sender: 'billing-receivable-settings',
}

function onNavigate(step: OnboardingStepKey) {
  let query: Record<string, string> | undefined
  if (step === 'setup') {
    query = { setup: '1' }
    const pending = (routersQuery.data.value?.data ?? []).filter((r) => !r.isolir_ready)
    // Satu-satunya router yang belum siap langsung dibuka setup-nya.
    if (pending.length === 1 && pending[0]) query.router_id = pending[0].id
  }
  void router.push({ name: STEP_ROUTE[step], query })
}

const STATUS_LABELS: [string, string][] = [
  ['pending', 'Menunggu'],
  ['running', 'Berjalan'],
  ['done', 'Selesai'],
  ['failed', 'Gagal'],
  ['cancelled', 'Dibatalkan'],
]

const pendingAgeMinutes = computed(() => {
  const at = summaryQuery.data.value?.oldest_pending_restore_at
  if (!at) return null
  const ms = Date.now() - new Date(at).getTime()
  return Math.max(0, Math.floor(ms / 60000))
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      v-if="!showControl"
      title="Ringkasan Jaringan"
      description="Status isolir PPPoE dan kesiapan setup."
    />

    <p v-if="onboardingQuery.isLoading.value" class="text-sm text-gray-500">Memuat...</p>
    <p v-else-if="onboardingQuery.isError.value" class="text-sm text-red-600" role="alert">
      Gagal memuat status setup.
    </p>

    <OnboardingChecklist
      v-else-if="status && !status.complete"
      :status="status"
      @navigate="onNavigate"
    />

    <ControlPage v-else-if="status && showControl" />

    <template v-else-if="status">
      <section
        v-if="showLaunchCta"
        class="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
      >
        <div>
          <p class="font-medium">Isolir otomatis belum aktif.</p>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Lihat simulasi dan jalankan uji pilot sebelum mengaktifkannya.
          </p>
        </div>
        <RouterLink
          :to="{ name: 'mikrotik-launch' }"
          class="inline-flex min-h-11 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
          >Buka Peluncuran Isolir</RouterLink
        >
      </section>

      <div
        v-if="pendingAgeMinutes !== null"
        class="rounded-lg bg-red-100 p-4 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-200"
        role="alert"
      >
        Ada pelanggan sudah bayar tapi belum dibuka (tertua {{ pendingAgeMinutes }} menit).
        <RouterLink :to="{ name: 'mikrotik-tasks' }" class="underline">Lihat tugas</RouterLink>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <BaseCard v-for="[key, label] in STATUS_LABELS" :key="key">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ label }}</p>
          <p class="mt-1 text-2xl font-bold">{{ counts[key] ?? 0 }}</p>
        </BaseCard>
      </div>

      <BaseCard>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">Tugas gagal terbaru</h2>
          <RouterLink
            :to="{ name: 'mikrotik-tasks' }"
            class="text-sm text-brand-600 hover:underline"
          >
            Semua tugas
          </RouterLink>
        </div>
        <p v-if="!failed.length" class="mt-3 text-sm text-gray-500">Tidak ada tugas gagal.</p>
        <ul v-else class="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
          <li v-for="t in failed" :key="t.id" class="py-2 text-sm">
            <p class="font-medium">{{ t.secret.name || t.account.name }} · {{ t.router.name }}</p>
            <p class="text-gray-600 dark:text-gray-300">
              {{ taskErrorAction(t.last_error_code).message }}
              {{ taskErrorAction(t.last_error_code).action }}
            </p>
          </li>
        </ul>
      </BaseCard>
    </template>
  </div>
</template>
