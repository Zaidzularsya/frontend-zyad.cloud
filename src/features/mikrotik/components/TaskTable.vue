<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import type { IsolationTask, TaskStatus } from '@/features/mikrotik/types'
import { taskErrorAction } from '@/features/mikrotik/utils/errors'

defineProps<{
  rows: IsolationTask[]
  canRetry: boolean
  /** Id tugas yang sedang diulang (tombolnya dinonaktifkan). */
  retryingId?: string
}>()

defineEmits<{ (e: 'retry', task: IsolationTask): void }>()

const OWNER_ONLY = 'Hanya Pemilik Organisasi yang dapat mengubah pengaturan ini.'

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: {
    label: 'Menunggu',
    cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  },
  running: {
    label: 'Berjalan',
    cls: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  },
  done: {
    label: 'Selesai',
    cls: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
  },
  failed: { label: 'Gagal', cls: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200' },
  cancelled: {
    label: 'Dibatalkan',
    cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
}

function statusView(s: TaskStatus) {
  return STATUS[s] ?? { label: s, cls: 'bg-gray-100 text-gray-700' }
}

function actionLabel(a: string) {
  if (a === 'isolate') return 'Isolir'
  if (a === 'restore') return 'Pulihkan'
  return a
}

function formatTime(iso: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-left text-sm">
      <thead class="text-gray-500">
        <tr>
          <th class="px-4 py-2 font-medium">Aksi</th>
          <th class="px-4 py-2 font-medium">Status</th>
          <th class="px-4 py-2 font-medium">Router</th>
          <th class="px-4 py-2 font-medium">Secret</th>
          <th class="px-4 py-2 font-medium">Pelanggan</th>
          <th class="px-4 py-2 font-medium">Percobaan</th>
          <th class="px-4 py-2 font-medium">Percobaan berikutnya</th>
          <th class="px-4 py-2 font-medium">Galat terakhir</th>
          <th class="px-4 py-2 font-medium"><span class="sr-only">Aksi</span></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
        <tr v-for="t in rows" :key="t.id" :data-task="t.id" class="align-top">
          <td class="px-4 py-2 font-medium">{{ actionLabel(t.action) }}</td>
          <td class="px-4 py-2">
            <span
              class="rounded-full px-2 py-0.5 text-xs font-medium"
              :class="statusView(t.status).cls"
            >
              {{ statusView(t.status).label }}
            </span>
          </td>
          <td class="px-4 py-2">{{ t.router.name }}</td>
          <td class="px-4 py-2 font-mono text-xs">{{ t.secret.name }}</td>
          <td class="px-4 py-2">{{ t.account.name || '-' }}</td>
          <td class="px-4 py-2 tabular-nums">{{ t.attempts }}</td>
          <td class="px-4 py-2 whitespace-nowrap">{{ formatTime(t.next_attempt_at) }}</td>
          <td class="max-w-sm px-4 py-2">
            <template v-if="t.last_error_code">
              <p class="font-medium">{{ taskErrorAction(t.last_error_code).message }}</p>
              <p class="text-gray-500 dark:text-gray-400">
                {{ taskErrorAction(t.last_error_code).action }}
              </p>
            </template>
            <span v-else class="text-gray-400">-</span>
          </td>
          <td class="px-4 py-2 text-right whitespace-nowrap">
            <span v-if="t.status === 'failed'" :title="canRetry ? undefined : OWNER_ONLY">
              <BaseButton
                variant="outline"
                class="!px-2 !py-1 !text-xs"
                :disabled="!canRetry || retryingId === t.id"
                :title="canRetry ? undefined : OWNER_ONLY"
                @click="$emit('retry', t)"
              >
                Coba Lagi
              </BaseButton>
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
