<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import {
  useOnboardingQuery,
  useRouterSummaryQuery,
  useRoutersQuery,
} from '@/features/mikrotik/api/mikrotik.queries'
import OnboardingChecklist, {
  type OnboardingStepKey,
} from '@/features/mikrotik/components/OnboardingChecklist.vue'
import PendingRestoreBanner from '@/features/mikrotik/components/PendingRestoreBanner.vue'
import IsolationStatusCard from '@/features/mikrotik/components/overview/IsolationStatusCard.vue'
import RouterLiveCards from '@/features/mikrotik/components/overview/RouterLiveCards.vue'
import RouterPicker from '@/features/mikrotik/components/overview/RouterPicker.vue'
import RouterStoredCards from '@/features/mikrotik/components/overview/RouterStoredCards.vue'
import { controlPermissions } from '@/features/mikrotik/utils/control-permissions'
import { useAuthStore } from '@/stores/auth.store'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const onboardingQuery = useOnboardingQuery()
const status = computed(() => onboardingQuery.data.value)

// --- router ---
const routersQuery = useRoutersQuery(ref({ per_page: 200 }))
const routers = computed(() => routersQuery.data.value?.data ?? [])
const onlineCount = computed(() => routers.value.filter((r) => r.last_check_status === 'ok').length)
// Bermasalah = cek terakhir gagal atau belum pernah dicek.
const headline = computed(
  () =>
    `${routers.value.length} router terpasang · ${onlineCount.value} online · ${routers.value.length - onlineCount.value} bermasalah`,
)

// Pilihan diingat di ?router=<id>; id kosong atau tak dikenal jatuh ke router pertama.
const selected = computed(() => {
  const wanted = route.query.router
  return routers.value.find((r) => r.id === wanted) ?? routers.value[0]
})
const selectedId = computed(() => selected.value?.id ?? '')
function selectRouter(id: string) {
  void router.replace({ query: { ...route.query, router: id } })
}

const summaryQuery = useRouterSummaryQuery(selectedId)
const summary = computed(() => summaryQuery.data.value)

// Banner membaca ringkasan tugas tenant-wide; tanpa izin tugas komponennya tidak dipasang (tanpa 403).
const canReadTasks = computed(() => auth.can('mikrotik_task.read'))

// Mode isolir dibaca hanya setelah onboarding lengkap dan hanya oleh yang berhak.
const showIsolationStatus = computed(
  () => controlPermissions(auth.user?.permissions ?? []).canRead && Boolean(status.value?.complete),
)

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
    const pending = routers.value.filter((r) => !r.isolir_ready)
    // Satu-satunya router yang belum siap langsung dibuka setup-nya.
    if (pending.length === 1 && pending[0]) query.router_id = pending[0].id
  }
  void router.push({ name: STEP_ROUTE[step], query })
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Ringkasan Jaringan"
      :description="routers.length ? headline : 'Kondisi router dan isolir PPPoE.'"
    >
      <RouterPicker
        v-if="routers.length > 1"
        :routers="routers"
        :model-value="selectedId"
        @update:model-value="selectRouter"
      />
    </PageHeader>

    <p v-if="onboardingQuery.isError.value" class="text-sm text-red-600" role="alert">
      Gagal memuat status setup.
    </p>
    <OnboardingChecklist
      v-else-if="status && !status.complete"
      :status="status"
      @navigate="onNavigate"
    />

    <PendingRestoreBanner v-if="canReadTasks" />

    <p v-if="routersQuery.isLoading.value" class="text-sm text-gray-500">Memuat router...</p>
    <p v-else-if="routersQuery.isError.value" class="text-sm text-red-600" role="alert">
      Gagal memuat daftar router.
    </p>

    <BaseCard v-else-if="!routers.length" class="text-center">
      <h2 class="font-semibold">Belum ada router</h2>
      <p class="mx-auto mt-1 max-w-md text-sm text-gray-600 dark:text-gray-300">
        Tambahkan router MikroTik agar kondisi jaringan dan secret PPPoE tampil di sini.
      </p>
      <RouterLink
        :to="{ name: 'mikrotik-routers' }"
        class="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900"
        >Tambah router</RouterLink
      >
    </BaseCard>

    <section v-else-if="selected" class="space-y-4" :aria-label="`Router ${selected.name}`">
      <h2 v-if="routers.length === 1" class="text-lg font-semibold">{{ selected.name }}</h2>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <RouterLiveCards
          :key="`live-${selected.id}`"
          :router-id="selected.id"
          :secrets-total="summary?.secrets.total"
        />
        <RouterStoredCards
          :key="`stored-${selected.id}`"
          :router="selected"
          :summary="summary"
          :summary-loading="summaryQuery.isLoading.value"
          :summary-error="summaryQuery.isError.value"
        />
        <IsolationStatusCard v-if="showIsolationStatus" />
      </div>
    </section>
  </div>
</template>
