<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import DataPagination from '@/components/ui/DataPagination.vue'
import { useToast } from '@/components/ui/toast'
import {
  useRetryTaskMutation,
  useRoutersQuery,
  useTasksQuery,
  useTaskSummaryQuery,
} from '@/features/mikrotik/api/mikrotik.queries'
import TaskTable from '@/features/mikrotik/components/TaskTable.vue'
import type { IsolationTask, TaskListParams, TaskStatus } from '@/features/mikrotik/types'
import { routerActionError } from '@/features/mikrotik/utils/errors'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const toast = useToast()
const canRetry = computed(() => auth.can('mikrotik_task.retry'))

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: 'Menunggu' },
  { value: 'running', label: 'Berjalan' },
  { value: 'failed', label: 'Gagal' },
  { value: 'done', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
]

const status = ref<TaskStatus | ''>('')
const routerId = ref('')
const page = ref(1)
const perPage = ref(20)
watch([status, routerId, perPage], () => (page.value = 1))

// Backend memakai limit/offset; DataPagination memakai page/per_page.
const params = computed<TaskListParams>(() => ({
  ...(status.value ? { status: status.value } : {}),
  ...(routerId.value ? { router_id: routerId.value } : {}),
  limit: perPage.value,
  offset: (page.value - 1) * perPage.value,
}))

const listQuery = useTasksQuery(params)
const rows = computed(() => listQuery.data.value?.data ?? [])
const total = computed(() => listQuery.data.value?.meta?.total ?? 0)

const routersQuery = useRoutersQuery(ref({ per_page: 100 }))
const routers = computed(() => routersQuery.data.value?.data ?? [])

const summaryQuery = useTaskSummaryQuery()
const counts = computed(() => summaryQuery.data.value?.counts ?? {})
const oldestRestore = computed(() => summaryQuery.data.value?.oldest_pending_restore_at ?? null)
const oldestMinutes = computed(() => {
  if (!oldestRestore.value) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(oldestRestore.value).getTime()) / 60_000))
})

const retryMutation = useRetryTaskMutation()
const retryingId = ref('')
async function retry(task: IsolationTask) {
  if (!canRetry.value) return
  retryingId.value = task.id
  try {
    await retryMutation.mutateAsync(task.id)
    toast.success('Tugas dijadwalkan ulang.')
  } catch (error) {
    toast.error(routerActionError(error))
  } finally {
    retryingId.value = ''
  }
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Tugas Isolir" description="Antrean isolir dan pemulihan PPPoE.">
      <div class="flex flex-wrap items-center gap-2">
        <label class="text-sm">
          <span class="sr-only">Status</span>
          <select
            v-model="status"
            name="status"
            class="rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950"
          >
            <option value="">Semua status</option>
            <option v-for="s in STATUSES" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </label>
        <label class="text-sm">
          <span class="sr-only">Router</span>
          <select
            v-model="routerId"
            name="router"
            class="rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950"
          >
            <option value="">Semua router</option>
            <option v-for="r in routers" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </label>
      </div>
    </PageHeader>

    <div
      v-if="oldestRestore"
      class="rounded-lg bg-red-100 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
      role="alert"
    >
      Ada pemulihan yang tertunda: pelanggan sudah bayar tapi belum dibuka (tertua
      {{ oldestMinutes }} menit).
    </div>

    <ul class="flex flex-wrap gap-2 text-sm" data-testid="summary">
      <li
        v-for="s in STATUSES"
        :key="s.value"
        class="rounded-full border px-3 py-1"
        :class="s.value === 'failed' && (counts[s.value] ?? 0) > 0 ? 'border-red-300' : ''"
      >
        {{ s.label }} <span class="font-semibold tabular-nums">{{ counts[s.value] ?? 0 }}</span>
      </li>
    </ul>

    <BaseCard class="!p-0">
      <p v-if="listQuery.isPending.value" class="p-12 text-center text-sm text-gray-500">
        Memuat data...
      </p>
      <p v-else-if="!rows.length" class="p-12 text-center text-sm text-gray-500">
        Tidak ada tugas yang cocok.
      </p>
      <TaskTable
        v-else
        :rows="rows"
        :can-retry="canRetry"
        :retrying-id="retryingId"
        @retry="retry"
      />
      <DataPagination
        v-model:page="page"
        v-model:per-page="perPage"
        :total="total"
        item-label="tugas"
      />
    </BaseCard>
  </div>
</template>
