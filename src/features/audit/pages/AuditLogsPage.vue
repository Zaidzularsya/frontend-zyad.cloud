<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { FileClock, LogIn, RefreshCw, Search, ShieldAlert, Users } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { useAuditLogsQuery, useLoginHistoriesQuery } from '@/features/audit/api/audit.queries'
import type {
  AuditLogResponse,
  AuditLogQuery,
  LoginHistoryQuery,
  LoginHistoryResponse,
} from '@/features/audit/api/audit.api'
import { formatDate } from '@/lib/utils'

type AuditTab = 'audit' | 'login'

const activeTab = ref<AuditTab>('audit')
const pageSize = ref(10)
const page = ref(1)
const search = ref('')
const createdFrom = ref('')
const createdTo = ref('')
const sort = ref('created_at')
const direction = ref<'asc' | 'desc'>('desc')

const moduleFilter = ref('')
const eventFilter = ref('')
const actorUserIdFilter = ref('')
const targetUserIdFilter = ref('')
const selectedAuditId = ref('')

const loginUserIdFilter = ref('')
const loginEventFilter = ref('')
const loginSuccessFilter = ref<'all' | 'true' | 'false'>('all')
const loginIpFilter = ref('')
const selectedLoginId = ref('')

const auditParams = computed<AuditLogQuery>(() => ({
  page: page.value,
  per_page: pageSize.value,
  module: moduleFilter.value.trim() || undefined,
  event: eventFilter.value.trim() || undefined,
  actor_user_id: actorUserIdFilter.value.trim() || undefined,
  target_user_id: targetUserIdFilter.value.trim() || undefined,
  search: search.value.trim() || undefined,
  created_from: createdFrom.value || undefined,
  created_to: createdTo.value || undefined,
  sort: sort.value || undefined,
  direction: direction.value,
}))

const loginParams = computed<LoginHistoryQuery>(() => ({
  page: page.value,
  per_page: pageSize.value,
  user_id: loginUserIdFilter.value.trim() || undefined,
  event: loginEventFilter.value.trim() || undefined,
  success: loginSuccessFilter.value === 'all' ? undefined : loginSuccessFilter.value === 'true',
  ip_address: loginIpFilter.value.trim() || undefined,
  search: search.value.trim() || undefined,
  created_from: createdFrom.value || undefined,
  created_to: createdTo.value || undefined,
  sort: sort.value || undefined,
  direction: direction.value,
}))

const auditQuery = useAuditLogsQuery(auditParams)
const loginQuery = useLoginHistoriesQuery(loginParams)

const auditLogs = computed(() => auditQuery.data.value?.data ?? [])
const auditMeta = computed(() => auditQuery.data.value?.meta)
const loginHistories = computed(() => loginQuery.data.value?.data ?? [])
const loginMeta = computed(() => loginQuery.data.value?.meta)

const selectedAuditLog = computed<AuditLogResponse | null>(() => {
  if (!selectedAuditId.value) return null
  return auditLogs.value.find((item) => item.id === selectedAuditId.value) ?? null
})

const selectedLoginHistory = computed<LoginHistoryResponse | null>(() => {
  if (!selectedLoginId.value) return null
  return loginHistories.value.find((item) => item.id === selectedLoginId.value) ?? null
})

const visibleRows = computed(() =>
  activeTab.value === 'audit' ? auditLogs.value : loginHistories.value,
)

function resetAuditFilters() {
  search.value = ''
  createdFrom.value = ''
  createdTo.value = ''
  moduleFilter.value = ''
  eventFilter.value = ''
  actorUserIdFilter.value = ''
  targetUserIdFilter.value = ''
  page.value = 1
}

function resetLoginFilters() {
  search.value = ''
  createdFrom.value = ''
  createdTo.value = ''
  loginUserIdFilter.value = ''
  loginEventFilter.value = ''
  loginSuccessFilter.value = 'all'
  loginIpFilter.value = ''
  page.value = 1
}

function toneAudit(module: string) {
  if (module === 'auth') return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
  if (module === 'user')
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
  if (module === 'permission')
    return 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400'
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
}

function toneLogin(success: boolean) {
  return success
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
    : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
}

function selectAuditLog(log: AuditLogResponse) {
  selectedAuditId.value = log.id
}

function selectLoginHistory(history: LoginHistoryResponse) {
  selectedLoginId.value = history.id
}

watch(
  auditLogs,
  (items) => {
    if (activeTab.value !== 'audit') return
    selectedAuditId.value = items[0]?.id ?? ''
  },
  { immediate: true },
)

watch(
  loginHistories,
  (items) => {
    if (activeTab.value !== 'login') return
    selectedLoginId.value = items[0]?.id ?? ''
  },
  { immediate: true },
)

watch(activeTab, () => {
  page.value = 1
  if (activeTab.value === 'audit' && auditLogs.value.length) {
    selectedAuditId.value = auditLogs.value[0]?.id ?? ''
  }
  if (activeTab.value === 'login' && loginHistories.value.length) {
    selectedLoginId.value = loginHistories.value[0]?.id ?? ''
  }
})

function changePage(delta: number) {
  const next = page.value + delta
  if (next < 1) return
  page.value = next
}

function refreshAll() {
  void Promise.all([auditQuery.refetch(), loginQuery.refetch()])
}

function prettyMetadata(metadata: Record<string, unknown>) {
  return JSON.stringify(metadata, null, 2)
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Audit Logs"
      description="Telusuri jejak aktivitas sistem dan login history tanpa modal. Cocok untuk investigasi cepat."
    >
      <BaseButton
        variant="secondary"
        :disabled="auditQuery.isFetching.value || loginQuery.isFetching.value"
        @click="refreshAll"
      >
        <RefreshCw
          class="size-4"
          :class="{ 'animate-spin': auditQuery.isFetching.value || loginQuery.isFetching.value }"
        />
        Refresh
      </BaseButton>
    </PageHeader>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <BaseCard class="!p-4">
        <div class="flex items-center gap-3">
          <span class="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <FileClock class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">Audit events</p>
            <p class="text-2xl font-bold">{{ auditMeta?.total ?? 0 }}</p>
          </div>
        </div>
      </BaseCard>
      <BaseCard class="!p-4">
        <div class="flex items-center gap-3">
          <span class="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <LogIn class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">Login histories</p>
            <p class="text-2xl font-bold">{{ loginMeta?.total ?? 0 }}</p>
          </div>
        </div>
      </BaseCard>
      <BaseCard class="!p-4">
        <div class="flex items-center gap-3">
          <span class="grid size-11 place-items-center rounded-2xl bg-amber-50 text-amber-600">
            <ShieldAlert class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">Page</p>
            <p class="text-2xl font-bold">{{ page }}</p>
          </div>
        </div>
      </BaseCard>
      <BaseCard class="!p-4">
        <div class="flex items-center gap-3">
          <span class="grid size-11 place-items-center rounded-2xl bg-gray-100 text-gray-600">
            <Users class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">Visible rows</p>
            <p class="text-2xl font-bold">{{ visibleRows.length }}</p>
          </div>
        </div>
      </BaseCard>
    </div>

    <div class="flex gap-2 overflow-x-auto border-b">
      <button
        class="border-b-2 px-4 py-2 text-sm font-medium transition-all"
        :class="
          activeTab === 'audit'
            ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        "
        @click="activeTab = 'audit'"
      >
        Audit activity
      </button>
      <button
        class="border-b-2 px-4 py-2 text-sm font-medium transition-all"
        :class="
          activeTab === 'login'
            ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        "
        @click="activeTab = 'login'"
      >
        Login histories
      </button>
    </div>

    <div v-if="activeTab === 'audit'" class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <BaseCard class="!p-0">
        <div
          class="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <h2 class="text-lg font-semibold">Global audit logs</h2>
            <p class="text-sm text-gray-500">
              Filter by module, event, actor, target, and time range.
            </p>
          </div>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label class="relative w-full sm:w-72">
              <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input
                v-model="search"
                type="search"
                placeholder="Cari metadata atau event..."
                class="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
              />
            </label>
            <BaseButton variant="secondary" @click="resetAuditFilters">Reset</BaseButton>
          </div>
        </div>

        <div class="grid gap-3 border-b p-5 lg:grid-cols-2 xl:grid-cols-3">
          <input
            v-model="moduleFilter"
            type="text"
            placeholder="Module"
            class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          />
          <input
            v-model="eventFilter"
            type="text"
            placeholder="Event"
            class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          />
          <input
            v-model="actorUserIdFilter"
            type="text"
            placeholder="Actor user ID"
            class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          />
          <input
            v-model="targetUserIdFilter"
            type="text"
            placeholder="Target user ID"
            class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          />
          <input
            v-model="createdFrom"
            type="date"
            class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          />
          <input
            v-model="createdTo"
            type="date"
            class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          />
        </div>

        <div
          v-if="auditQuery.isPending.value"
          class="min-h-[520px] p-12 text-center text-sm text-gray-500"
        >
          Memuat audit logs...
        </div>
        <div v-else-if="auditQuery.isError.value" class="min-h-[520px] p-12 text-center">
          <p class="font-semibold text-red-700">Audit logs gagal dimuat.</p>
          <button class="mt-2 text-sm font-medium text-brand-600" @click="auditQuery.refetch()">
            Coba lagi
          </button>
        </div>
        <div v-else class="min-h-[520px]">
          <div class="overflow-x-auto">
            <table class="min-w-full border-separate border-spacing-0">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wider text-gray-500">
                  <th class="border-b px-5 py-3">Module</th>
                  <th class="border-b px-5 py-3">Event</th>
                  <th class="border-b px-5 py-3">Target</th>
                  <th class="border-b px-5 py-3">Actor</th>
                  <th class="border-b px-5 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="log in auditLogs"
                  :key="log.id"
                  class="cursor-pointer align-top hover:bg-brand-50/30 dark:hover:bg-brand-950/20"
                  :class="selectedAuditId === log.id ? 'bg-brand-50/40 dark:bg-brand-950/30' : ''"
                  @click="selectAuditLog(log)"
                >
                  <td class="border-b px-5 py-4">
                    <span
                      class="rounded-full px-2.5 py-1 text-xs font-semibold"
                      :class="toneAudit(log.module)"
                    >
                      {{ log.module }}
                    </span>
                  </td>
                  <td class="border-b px-5 py-4">
                    <p class="font-medium">{{ log.event }}</p>
                    <p class="text-sm text-gray-500">{{ log.ip_address }}</p>
                  </td>
                  <td class="border-b px-5 py-4">
                    <p class="font-medium">{{ log.target_type }}</p>
                    <p class="text-sm text-gray-500">{{ log.target_id || '-' }}</p>
                  </td>
                  <td class="border-b px-5 py-4">
                    <p class="font-medium">{{ log.actor_user_id || '-' }}</p>
                    <p class="text-sm text-gray-500">{{ log.user_agent }}</p>
                  </td>
                  <td class="border-b px-5 py-4 text-sm text-gray-500">
                    {{ formatDate(log.created_at) }}
                  </td>
                </tr>
                <tr v-if="!auditLogs.length">
                  <td colspan="5" class="px-5 py-12 text-center text-gray-500">
                    Tidak ada audit log yang cocok dengan filter.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div
          class="flex flex-col gap-3 border-t p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-sm text-gray-500">
            Menampilkan {{ auditLogs.length }} item pada halaman {{ auditMeta?.page ?? 1 }} dari
            {{ auditMeta?.total_pages ?? 1 }}.
          </p>
          <div class="flex items-center gap-2">
            <select
              v-model="pageSize"
              class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
            >
              <option :value="10">10 / halaman</option>
              <option :value="20">20 / halaman</option>
              <option :value="50">50 / halaman</option>
            </select>
            <BaseButton variant="secondary" :disabled="page <= 1" @click="changePage(-1)"
              >Sebelumnya</BaseButton
            >
            <BaseButton
              variant="secondary"
              :disabled="page >= (auditMeta?.total_pages ?? 1)"
              @click="changePage(1)"
            >
              Berikutnya
            </BaseButton>
          </div>
        </div>
      </BaseCard>

      <BaseCard class="sticky top-6 space-y-4 self-start">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold">Selected log</h2>
            <p class="text-sm text-gray-500">Detail metadata untuk investigasi cepat.</p>
          </div>
          <span
            class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            {{ selectedAuditLog ? selectedAuditLog.module : 'none' }}
          </span>
        </div>

        <div v-if="selectedAuditLog" class="space-y-4">
          <div class="rounded-xl border bg-gray-50 p-4 text-sm dark:bg-gray-900">
            <div class="grid gap-2">
              <div class="flex items-center justify-between gap-3">
                <span class="text-gray-500">Event</span>
                <span class="font-medium">{{ selectedAuditLog.event }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-gray-500">Module</span>
                <span class="font-medium">{{ selectedAuditLog.module }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-gray-500">Target type</span>
                <span class="font-medium">{{ selectedAuditLog.target_type }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-gray-500">Target ID</span>
                <span class="font-medium">{{ selectedAuditLog.target_id || '-' }}</span>
              </div>
            </div>
          </div>

          <div class="space-y-2 rounded-xl border bg-gray-50 p-4 dark:bg-gray-900">
            <p class="text-xs uppercase tracking-wider text-gray-500">Metadata</p>
            <pre class="whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-200">{{
              prettyMetadata(selectedAuditLog.metadata)
            }}</pre>
          </div>
        </div>

        <div v-else class="rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
          Pilih log untuk melihat detail metadata.
        </div>
      </BaseCard>
    </div>

    <div v-else class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <BaseCard class="!p-0">
        <div
          class="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <h2 class="text-lg font-semibold">Login histories</h2>
            <p class="text-sm text-gray-500">
              Lacak login sukses/gagal dengan filter user, event, IP, dan rentang waktu.
            </p>
          </div>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label class="relative w-full sm:w-72">
              <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input
                v-model="search"
                type="search"
                placeholder="Cari identifier, device, reason..."
                class="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
              />
            </label>
            <BaseButton variant="secondary" @click="resetLoginFilters">Reset</BaseButton>
          </div>
        </div>

        <div class="grid gap-3 border-b p-5 lg:grid-cols-2 xl:grid-cols-3">
          <input
            v-model="loginUserIdFilter"
            type="text"
            placeholder="User ID"
            class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          />
          <input
            v-model="loginEventFilter"
            type="text"
            placeholder="Event"
            class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          />
          <input
            v-model="loginIpFilter"
            type="text"
            placeholder="IP address"
            class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          />
          <select
            v-model="loginSuccessFilter"
            class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          >
            <option value="all">Semua hasil</option>
            <option value="true">Success</option>
            <option value="false">Failed</option>
          </select>
          <input
            v-model="createdFrom"
            type="date"
            class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          />
          <input
            v-model="createdTo"
            type="date"
            class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          />
        </div>

        <div
          v-if="loginQuery.isPending.value"
          class="min-h-[520px] p-12 text-center text-sm text-gray-500"
        >
          Memuat login histories...
        </div>
        <div v-else-if="loginQuery.isError.value" class="min-h-[520px] p-12 text-center">
          <p class="font-semibold text-red-700">Login histories gagal dimuat.</p>
          <button class="mt-2 text-sm font-medium text-brand-600" @click="loginQuery.refetch()">
            Coba lagi
          </button>
        </div>
        <div v-else class="min-h-[520px]">
          <div class="overflow-x-auto">
            <table class="min-w-full border-separate border-spacing-0">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wider text-gray-500">
                  <th class="border-b px-5 py-3">Result</th>
                  <th class="border-b px-5 py-3">Identifier</th>
                  <th class="border-b px-5 py-3">Device</th>
                  <th class="border-b px-5 py-3">IP</th>
                  <th class="border-b px-5 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="history in loginHistories"
                  :key="history.id"
                  class="cursor-pointer align-top hover:bg-brand-50/30 dark:hover:bg-brand-950/20"
                  :class="
                    selectedLoginId === history.id ? 'bg-brand-50/40 dark:bg-brand-950/30' : ''
                  "
                  @click="selectLoginHistory(history)"
                >
                  <td class="border-b px-5 py-4">
                    <span
                      class="rounded-full px-2.5 py-1 text-xs font-semibold"
                      :class="toneLogin(history.success)"
                    >
                      {{ history.success ? 'success' : 'failed' }}
                    </span>
                  </td>
                  <td class="border-b px-5 py-4">
                    <p class="font-medium">{{ history.identifier }}</p>
                    <p class="text-sm text-gray-500">{{ history.event }}</p>
                  </td>
                  <td class="border-b px-5 py-4">
                    <p class="font-medium">{{ history.device_name || '-' }}</p>
                    <p class="text-sm text-gray-500">{{ history.reason || '-' }}</p>
                  </td>
                  <td class="border-b px-5 py-4">
                    <p class="font-medium">{{ history.ip_address }}</p>
                  </td>
                  <td class="border-b px-5 py-4 text-sm text-gray-500">
                    {{ formatDate(history.created_at) }}
                  </td>
                </tr>
                <tr v-if="!loginHistories.length">
                  <td colspan="5" class="px-5 py-12 text-center text-gray-500">
                    Tidak ada login history yang cocok dengan filter.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div
          class="flex flex-col gap-3 border-t p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-sm text-gray-500">
            Menampilkan {{ loginHistories.length }} item pada halaman
            {{ loginMeta?.page ?? 1 }} dari {{ loginMeta?.total_pages ?? 1 }}.
          </p>
          <div class="flex items-center gap-2">
            <select
              v-model="pageSize"
              class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
            >
              <option :value="10">10 / halaman</option>
              <option :value="20">20 / halaman</option>
              <option :value="50">50 / halaman</option>
            </select>
            <BaseButton variant="secondary" :disabled="page <= 1" @click="changePage(-1)"
              >Sebelumnya</BaseButton
            >
            <BaseButton
              variant="secondary"
              :disabled="page >= (loginMeta?.total_pages ?? 1)"
              @click="changePage(1)"
            >
              Berikutnya
            </BaseButton>
          </div>
        </div>
      </BaseCard>

      <BaseCard class="sticky top-6 space-y-4 self-start">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold">Selected login</h2>
            <p class="text-sm text-gray-500">Detail sesi login, device, dan reason failure.</p>
          </div>
          <span
            class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            {{
              selectedLoginHistory ? (selectedLoginHistory.success ? 'success' : 'failed') : 'none'
            }}
          </span>
        </div>

        <div v-if="selectedLoginHistory" class="space-y-4">
          <div class="rounded-xl border bg-gray-50 p-4 text-sm dark:bg-gray-900">
            <div class="grid gap-2">
              <div class="flex items-center justify-between gap-3">
                <span class="text-gray-500">Identifier</span>
                <span class="font-medium">{{ selectedLoginHistory.identifier }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-gray-500">Event</span>
                <span class="font-medium">{{ selectedLoginHistory.event }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-gray-500">Device</span>
                <span class="font-medium">{{ selectedLoginHistory.device_name || '-' }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-gray-500">IP</span>
                <span class="font-medium">{{ selectedLoginHistory.ip_address }}</span>
              </div>
            </div>
          </div>

          <div class="space-y-2 rounded-xl border bg-gray-50 p-4 dark:bg-gray-900">
            <p class="text-xs uppercase tracking-wider text-gray-500">Reason</p>
            <p class="text-sm text-gray-700 dark:text-gray-200">
              {{ selectedLoginHistory.reason || '-' }}
            </p>
          </div>
        </div>

        <div v-else class="rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
          Pilih login history untuk melihat detail sesi.
        </div>
      </BaseCard>
    </div>
  </div>
</template>
