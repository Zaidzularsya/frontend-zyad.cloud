<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import PageHeader from '@/components/common/PageHeader.vue'
import { useControlQuery } from '@/features/mikrotik/api/mikrotik.queries'
import ControlPanel from '@/features/mikrotik/components/ControlPanel.vue'
import LaunchPanel from '@/features/mikrotik/components/LaunchPanel.vue'
import PendingRestoreBanner from '@/features/mikrotik/components/PendingRestoreBanner.vue'
import TasksPanel from '@/features/mikrotik/components/TasksPanel.vue'
import type { ControlState, TaskStatus } from '@/features/mikrotik/types'
import { controlPermissions } from '@/features/mikrotik/utils/control-permissions'
import { useAuthStore } from '@/stores/auth.store'

// Satu halaman untuk Peluncuran (simulation/pilot), Kendali (active/paused), dan antrean Tugas.
// Menu dan rute hanya butuh mikrotik_task.read; kendali dimuat hanya bila boleh dibaca.
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const canReadControl = computed(() => controlPermissions(auth.user?.permissions ?? []).canRead)
const controlQuery = useControlQuery(canReadControl)
const control = computed(() => controlQuery.data.value)
const mode = computed(() => control.value?.mode)
const launchStage = computed(() => mode.value === 'simulation' || mode.value === 'pilot')

const tab = computed<'control' | 'tasks'>(() => (route.query.tab === 'tasks' ? 'tasks' : 'control'))
const initialStatus = computed(() =>
  typeof route.query.status === 'string' ? (route.query.status as TaskStatus) : undefined,
)
const initialRouterId = computed(() =>
  typeof route.query.router_id === 'string' ? route.query.router_id : undefined,
)

const MODE_LABEL: Record<ControlState['mode'], string> = {
  simulation: 'Simulasi',
  pilot: 'Pilot',
  active: 'Aktif',
  paused: 'Dijeda',
}
const MODE_BADGE_CLASS: Record<ControlState['mode'], string> = {
  simulation: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
  pilot: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  active: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
  paused: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
}

const description = computed(() => {
  if (!canReadControl.value) return 'Antrean isolir dan pemulihan PPPoE.'
  if (launchStage.value) return 'Luncurkan isolir otomatis: simulasi, uji pilot, lalu aktifkan.'
  return 'Jeda, pulihkan, dan pantau isolir otomatis.'
})

function showFailedTasks() {
  void router.push({ query: { tab: 'tasks', status: 'failed' } })
}

// Klik tab yang sedang aktif mempertahankan query (status, router_id) agar filter TasksPanel tetap sinkron dengan URL.
function tabTarget(key: 'control' | 'tasks') {
  if (key === tab.value) return { name: 'mikrotik-isolation', query: { ...route.query, tab: key } }
  return { name: 'mikrotik-isolation', query: { tab: key } }
}

const TABS = [
  { key: 'control', label: 'Kendali' },
  { key: 'tasks', label: 'Tugas' },
] as const
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Isolir" :description="description">
      <span
        v-if="canReadControl && mode"
        class="rounded-full px-3 py-1 text-xs font-medium"
        :class="MODE_BADGE_CLASS[mode]"
        data-testid="mode-badge"
        >{{ MODE_LABEL[mode] }}</span
      >
    </PageHeader>

    <PendingRestoreBanner />

    <TasksPanel
      v-if="!canReadControl"
      :initial-status="initialStatus"
      :initial-router-id="initialRouterId"
    />

    <p v-else-if="controlQuery.isPending.value" class="text-sm text-gray-600" role="status">
      Memuat...
    </p>
    <p v-else-if="controlQuery.isError.value || !control" class="text-sm text-red-700" role="alert">
      Gagal memuat status kendali.
      <button type="button" class="font-medium underline" @click="controlQuery.refetch()">
        Coba lagi
      </button>
    </p>

    <template v-else-if="launchStage">
      <template v-if="tab === 'tasks'">
        <RouterLink :to="{ name: 'mikrotik-isolation' }" class="text-sm font-medium underline">
          Kembali ke peluncuran
        </RouterLink>
        <TasksPanel :initial-status="initialStatus" :initial-router-id="initialRouterId" />
      </template>
      <template v-else>
        <LaunchPanel />
        <RouterLink
          :to="{ name: 'mikrotik-isolation', query: { tab: 'tasks' } }"
          class="inline-block text-sm font-medium underline"
        >
          Lihat antrean tugas
        </RouterLink>
      </template>
    </template>

    <template v-else>
      <nav aria-label="Isolir" class="flex gap-1 border-b">
        <RouterLink
          v-for="t in TABS"
          :key="t.key"
          :aria-current="tab === t.key ? 'page' : undefined"
          :to="tabTarget(t.key)"
          class="-mb-px inline-flex min-h-11 items-center border-b-2 px-4 text-sm font-medium"
          :class="
            tab === t.key
              ? 'border-brand-600 text-brand-700 dark:text-brand-400'
              : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
          "
          >{{ t.label }}</RouterLink
        >
      </nav>
      <div>
        <TasksPanel
          v-if="tab === 'tasks'"
          :initial-status="initialStatus"
          :initial-router-id="initialRouterId"
        />
        <ControlPanel v-else @show-failed-tasks="showFailedTasks" />
      </div>
    </template>
  </div>
</template>
