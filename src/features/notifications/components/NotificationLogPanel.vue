<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RefreshCw, Search, RotateCcw, Slash } from 'lucide-vue-next'

import PermissionGate from '@/components/common/PermissionGate.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import {
  useCancelNotificationLogMutation,
  useNotificationLogsQuery,
  useRetryNotificationLogMutation,
} from '@/features/notifications/api/notifications.queries'
import type {
  NotificationChannel,
  NotificationLogResponse,
  NotificationLogStatus,
} from '@/features/notifications/api/notifications.api'
import { formatDate } from '@/lib/utils'

const pageSize = ref(10)
const offset = ref(0)
const search = ref('')
const channelFilter = ref<'all' | NotificationChannel>('all')
const statusFilter = ref<'all' | NotificationLogStatus>('all')
const eventTypeFilter = ref('')
const templateCodeFilter = ref('')
const organizationIdFilter = ref('')
const recipientUserIdFilter = ref('')
const selectedLogId = ref('')
const formError = ref('')

const listParams = computed(() => ({
  limit: pageSize.value,
  offset: offset.value,
  event_type: eventTypeFilter.value.trim() || undefined,
  template_code: templateCodeFilter.value.trim() || undefined,
  organization_id: organizationIdFilter.value.trim() || undefined,
  recipient_user_id: recipientUserIdFilter.value.trim() || undefined,
  channel: channelFilter.value === 'all' ? undefined : channelFilter.value,
  status: statusFilter.value === 'all' ? undefined : statusFilter.value,
}))

const logsQuery = useNotificationLogsQuery(listParams)
const retryLogMut = useRetryNotificationLogMutation()
const cancelLogMut = useCancelNotificationLogMutation()

const logs = computed(() => logsQuery.data.value?.data ?? [])
const meta = computed(() => logsQuery.data.value?.meta)
const selectedLog = computed<NotificationLogResponse | null>(() => {
  if (!selectedLogId.value) return null
  return logs.value.find((log) => log.id === selectedLogId.value) ?? null
})
const hasMore = computed(() => (meta.value?.count ?? 0) >= pageSize.value)

const filteredLogs = computed(() => {
  const term = search.value.trim().toLowerCase()
  return logs.value.filter((log) => {
    const matchesTerm =
      !term ||
      log.event_type?.toLowerCase().includes(term) ||
      log.template_code?.toLowerCase().includes(term) ||
      log.destination.toLowerCase().includes(term) ||
      log.recipient_email_snapshot?.toLowerCase().includes(term) ||
      log.recipient_name_snapshot?.toLowerCase().includes(term)
    return matchesTerm
  })
})

function tone(status: string) {
  if (status === 'sent')
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
  if (status === 'failed' || status === 'dead')
    return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
  if (status === 'cancelled') return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  if (status === 'processing')
    return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
  return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
}

function resetFilters() {
  search.value = ''
  channelFilter.value = 'all'
  statusFilter.value = 'all'
  eventTypeFilter.value = ''
  templateCodeFilter.value = ''
  organizationIdFilter.value = ''
  recipientUserIdFilter.value = ''
  offset.value = 0
}

function selectLog(log: NotificationLogResponse) {
  selectedLogId.value = log.id
  formError.value = ''
}

watch(
  logs,
  (items) => {
    if (!items.length) {
      selectedLogId.value = ''
      return
    }
    if (!selectedLogId.value) {
      selectedLogId.value = items[0]?.id ?? ''
      return
    }
    if (!items.some((item) => item.id === selectedLogId.value)) {
      selectedLogId.value = items[0]?.id ?? ''
    }
  },
  { immediate: true },
)

watch(
  [
    search,
    channelFilter,
    statusFilter,
    eventTypeFilter,
    templateCodeFilter,
    organizationIdFilter,
    recipientUserIdFilter,
    pageSize,
  ],
  () => {
    offset.value = 0
  },
)

async function retrySelectedLog() {
  if (!selectedLog.value) return
  formError.value = ''
  try {
    await retryLogMut.mutateAsync(selectedLog.value.id)
    await logsQuery.refetch()
  } catch (error) {
    console.error(error)
    formError.value = 'Gagal retry log.'
  }
}

async function cancelSelectedLog() {
  if (!selectedLog.value) return
  if (!confirm(`Cancel log ${selectedLog.value.id}?`)) return
  formError.value = ''
  try {
    await cancelLogMut.mutateAsync(selectedLog.value.id)
    await logsQuery.refetch()
  } catch (error) {
    console.error(error)
    formError.value = 'Gagal cancel log.'
  }
}

function changeOffset(delta: number) {
  const next = offset.value + delta
  if (next < 0) return
  if (next > offset.value && !hasMore.value) return
  offset.value = next
}
</script>

<template>
  <div class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
    <BaseCard class="!p-0">
      <div class="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-lg font-semibold">Notification logs</h2>
          <p class="text-sm text-gray-500">
            Filter, inspect, retry, dan cancel delivery log untuk observability yang cepat.
          </p>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label class="relative w-full sm:w-72">
            <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="search"
              type="search"
              placeholder="Cari event, template, recipient..."
              class="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
            />
          </label>
          <select
            v-model="channelFilter"
            class="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950 sm:w-40"
          >
            <option value="all">Semua channel</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="in_app">In-app</option>
            <option value="discord">Discord</option>
          </select>
          <select
            v-model="statusFilter"
            class="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950 sm:w-40"
          >
            <option value="all">Semua status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
            <option value="dead">Dead</option>
          </select>
        </div>
      </div>

      <div class="grid gap-3 border-b p-5 lg:grid-cols-2 xl:grid-cols-3">
        <input
          v-model="eventTypeFilter"
          type="text"
          placeholder="Event type"
          class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
        />
        <input
          v-model="templateCodeFilter"
          type="text"
          placeholder="Template code"
          class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
        />
        <input
          v-model="organizationIdFilter"
          type="text"
          placeholder="Organization ID"
          class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
        />
        <input
          v-model="recipientUserIdFilter"
          type="text"
          placeholder="Recipient user ID"
          class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
        />
        <div class="flex items-center gap-2 xl:justify-end">
          <BaseButton variant="secondary" @click="resetFilters">
            <RefreshCw class="size-4" /> Reset filters
          </BaseButton>
        </div>
      </div>

      <div
        v-if="logsQuery.isPending.value"
        class="min-h-[520px] p-12 text-center text-sm text-gray-500"
      >
        Memuat log notifikasi...
      </div>
      <div v-else-if="logsQuery.isError.value" class="min-h-[520px] p-12 text-center">
        <p class="font-semibold text-red-700">Log notifikasi gagal dimuat.</p>
        <button class="mt-2 text-sm font-medium text-brand-600" @click="logsQuery.refetch()">
          Coba lagi
        </button>
      </div>
      <div v-else class="min-h-[520px]">
        <div class="overflow-x-auto">
          <table class="min-w-full border-separate border-spacing-0">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wider text-gray-500">
                <th class="border-b px-5 py-3">Status</th>
                <th class="border-b px-5 py-3">Event</th>
                <th class="border-b px-5 py-3">Template</th>
                <th class="border-b px-5 py-3">Recipient</th>
                <th class="border-b px-5 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="log in filteredLogs"
                :key="log.id"
                class="cursor-pointer align-top hover:bg-brand-50/30 dark:hover:bg-brand-950/20"
                :class="selectedLogId === log.id ? 'bg-brand-50/40 dark:bg-brand-950/30' : ''"
                @click="selectLog(log)"
              >
                <td class="border-b px-5 py-4">
                  <span
                    class="rounded-full px-2.5 py-1 text-xs font-semibold"
                    :class="tone(log.status)"
                  >
                    {{ log.status }}
                  </span>
                </td>
                <td class="border-b px-5 py-4">
                  <p class="font-medium">{{ log.event_type || '-' }}</p>
                  <p class="text-sm text-gray-500">{{ log.channel }}</p>
                </td>
                <td class="border-b px-5 py-4">
                  <p class="font-medium">{{ log.template_code || '-' }}</p>
                  <p class="text-sm text-gray-500">
                    attempt {{ log.attempts }}/{{ log.max_attempts }}
                  </p>
                </td>
                <td class="border-b px-5 py-4">
                  <p class="font-medium">
                    {{ log.recipient_name_snapshot || log.recipient_email_snapshot || '-' }}
                  </p>
                  <p class="text-sm text-gray-500">{{ log.destination }}</p>
                </td>
                <td class="border-b px-5 py-4 text-sm text-gray-500">
                  {{ formatDate(log.updated_at) }}
                </td>
              </tr>
              <tr v-if="!filteredLogs.length">
                <td colspan="5" class="px-5 py-12 text-center text-gray-500">
                  Tidak ada log yang cocok dengan filter.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="flex flex-col gap-3 border-t p-5 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-gray-500">
          Menampilkan {{ filteredLogs.length }} item pada offset {{ meta?.offset ?? 0 }}.
        </p>
        <div class="flex items-center gap-2">
          <select
            v-model="pageSize"
            class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          >
            <option :value="5">5 / halaman</option>
            <option :value="10">10 / halaman</option>
            <option :value="20">20 / halaman</option>
          </select>
          <BaseButton variant="secondary" :disabled="offset <= 0" @click="changeOffset(-pageSize)">
            Sebelumnya
          </BaseButton>
          <BaseButton variant="secondary" :disabled="!hasMore" @click="changeOffset(pageSize)">
            Berikutnya
          </BaseButton>
        </div>
      </div>
    </BaseCard>

    <BaseCard class="sticky top-6 space-y-4 self-start">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">Selected log</h2>
          <p class="text-sm text-gray-500">
            Detail payload, provider response, dan tindakan admin.
          </p>
        </div>
        <span
          class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          {{ selectedLog ? selectedLog.status : 'none' }}
        </span>
      </div>

      <div v-if="selectedLog" class="space-y-4">
        <div class="rounded-xl border bg-gray-50 p-4 text-sm dark:bg-gray-900">
          <div class="grid gap-2">
            <div class="flex items-center justify-between gap-3">
              <span class="text-gray-500">Event</span>
              <span class="font-medium">{{ selectedLog.event_type || '-' }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-gray-500">Template</span>
              <span class="font-medium">{{ selectedLog.template_code || '-' }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-gray-500">Channel</span>
              <span class="font-medium">{{ selectedLog.channel }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-gray-500">Destination</span>
              <span class="font-medium">{{ selectedLog.destination }}</span>
            </div>
          </div>
        </div>

        <div class="space-y-2 rounded-xl border bg-gray-50 p-4 dark:bg-gray-900">
          <p class="text-xs uppercase tracking-wider text-gray-500">Body</p>
          <pre class="whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-200">{{
            selectedLog.body
          }}</pre>
        </div>

        <div
          v-if="selectedLog.provider_response"
          class="space-y-2 rounded-xl border bg-gray-50 p-4 dark:bg-gray-900"
        >
          <p class="text-xs uppercase tracking-wider text-gray-500">Provider response</p>
          <pre class="whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-200">{{
            JSON.stringify(selectedLog.provider_response, null, 2)
          }}</pre>
        </div>

        <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {{ formError }}
        </p>

        <div class="flex flex-wrap gap-3">
          <PermissionGate permission="notification_log.retry">
            <BaseButton
              variant="secondary"
              class="flex-1 justify-center"
              :disabled="
                retryLogMut.isPending.value || !['pending', 'failed'].includes(selectedLog.status)
              "
              @click="retrySelectedLog"
            >
              <RotateCcw class="size-4" />
              {{ retryLogMut.isPending.value ? 'Retrying...' : 'Retry' }}
            </BaseButton>
          </PermissionGate>
          <PermissionGate permission="notification_log.cancel">
            <BaseButton
              variant="danger"
              class="flex-1 justify-center"
              :disabled="
                cancelLogMut.isPending.value ||
                ['sent', 'cancelled', 'dead'].includes(selectedLog.status)
              "
              @click="cancelSelectedLog"
            >
              <Slash class="size-4" />
              {{ cancelLogMut.isPending.value ? 'Cancelling...' : 'Cancel' }}
            </BaseButton>
          </PermissionGate>
        </div>
      </div>

      <div v-else class="rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
        Pilih log di daftar untuk melihat detail.
      </div>
    </BaseCard>
  </div>
</template>
