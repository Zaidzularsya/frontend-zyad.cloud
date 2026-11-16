<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { RouterLink } from 'vue-router'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { useToast } from '@/components/ui/toast'
import { useCheckRouterMutation, useTasksQuery } from '@/features/mikrotik/api/mikrotik.queries'
import AllowlistHealthWarning from '@/features/mikrotik/components/AllowlistHealthWarning.vue'
import type { Router, RouterSummary, TaskListParams } from '@/features/mikrotik/types'
import {
  checkStatusLabel,
  routerActionError,
  taskErrorAction,
} from '@/features/mikrotik/utils/errors'
import { relativeTime } from '@/features/mikrotik/utils/format'
import { useAuthStore } from '@/stores/auth.store'

// Kartu dari data tersimpan di DB: tampil tanpa menunggu stats live dari router.
const props = defineProps<{
  router: Router
  summary?: RouterSummary
  summaryLoading: boolean
  summaryError: boolean
}>()

const auth = useAuthStore()
const toast = useToast()
const canCheck = computed(() => auth.can('mikrotik_router.update'))
const canSetup = computed(() => auth.can('mikrotik_router.setup'))
const canReadTasks = computed(() => auth.can('mikrotik_task.read'))

// --- koneksi ---
const checkMutation = useCheckRouterMutation()
async function check() {
  try {
    await checkMutation.mutateAsync(props.router.id)
  } catch (error) {
    toast.error(routerActionError(error))
  }
}

const now = ref(Date.now())
const ticker = setInterval(() => (now.value = Date.now()), 30_000)
onBeforeUnmount(() => clearInterval(ticker))

const connection = computed(() => {
  const status = props.router.last_check_status
  if (!status)
    return {
      text: 'Belum dicek',
      cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      dot: 'bg-gray-400',
    }
  return status === 'ok'
    ? {
        text: 'Terhubung',
        cls: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
        dot: 'bg-green-500',
      }
    : {
        text: checkStatusLabel(status),
        cls: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200',
        dot: 'bg-red-500',
      }
})
const lastCheck = computed(() =>
  props.router.last_check_at ? relativeTime(props.router.last_check_at, now.value) : 'Belum pernah',
)
const apiLabel = computed(
  () =>
    `${props.router.api_type === 'rest' ? 'REST' : 'API biner'} · ${props.router.use_tls ? 'TLS' : 'tanpa TLS'}`,
)

const readyAt = computed(() =>
  props.router.isolir_ready_at
    ? new Date(props.router.isolir_ready_at).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '',
)

// --- secret ---
const secretRows = computed(() => {
  const s = props.summary?.secrets
  if (!s) return []
  return [
    { label: 'Terpasang ke pelanggan', value: s.paired },
    { label: 'Belum dipasang', value: s.unpaired },
    { label: 'Hilang dari router', value: s.missing },
    { label: 'Butuh profile asli', value: s.need_original_profile },
  ]
})

// --- tugas ---
const failedParams = computed<TaskListParams>(() => ({
  router_id: props.router.id,
  status: 'failed',
  limit: 5,
}))
const failedQuery = useTasksQuery(failedParams, canReadTasks)
const failed = computed(() => (failedQuery.data.value?.data ?? []).slice(0, 5))
</script>

<template>
  <BaseCard data-card="connection">
    <div class="flex items-start justify-between gap-2">
      <h3 class="font-semibold">Koneksi</h3>
      <span
        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
        :class="connection.cls"
      >
        <span class="h-1.5 w-1.5 rounded-full" :class="connection.dot" aria-hidden="true" />
        {{ connection.text }}
      </span>
    </div>
    <dl class="mt-4 space-y-2 text-sm">
      <div class="flex justify-between gap-3">
        <dt class="text-gray-500 dark:text-gray-400">Cek terakhir</dt>
        <dd class="text-right">{{ lastCheck }}</dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt class="text-gray-500 dark:text-gray-400">RouterOS</dt>
        <dd class="text-right">{{ router.routeros_version || '-' }}</dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt class="text-gray-500 dark:text-gray-400">Akses</dt>
        <dd class="text-right">{{ apiLabel }}</dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt class="text-gray-500 dark:text-gray-400">Alamat</dt>
        <dd class="min-w-0 break-all text-right tabular-nums">
          {{ router.host }}:{{ router.port }}
        </dd>
      </div>
    </dl>
    <BaseButton
      v-if="canCheck"
      class="mt-4 w-full"
      variant="outline"
      :disabled="checkMutation.isPending.value"
      @click="check"
    >
      {{ checkMutation.isPending.value ? 'Mengecek...' : 'Cek sekarang' }}
    </BaseButton>
  </BaseCard>

  <BaseCard data-card="readiness">
    <div class="flex items-start justify-between gap-2">
      <h3 class="font-semibold">Kesiapan isolir</h3>
      <span
        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
        :class="
          router.isolir_ready
            ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
        "
      >
        <span
          class="h-1.5 w-1.5 rounded-full"
          :class="router.isolir_ready ? 'bg-green-500' : 'bg-amber-500'"
          aria-hidden="true"
        />
        {{ router.isolir_ready ? 'Siap' : 'Belum siap' }}
      </span>
    </div>
    <dl v-if="router.isolir_ready" class="mt-4 space-y-2 text-sm">
      <div class="flex justify-between gap-3">
        <dt class="text-gray-500 dark:text-gray-400">Profile isolir</dt>
        <dd class="min-w-0 break-all text-right">{{ router.isolir_profile_name || '-' }}</dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt class="text-gray-500 dark:text-gray-400">Siap sejak</dt>
        <dd class="text-right">{{ readyAt || '-' }}</dd>
      </div>
    </dl>
    <p v-else class="mt-4 text-sm text-gray-600 dark:text-gray-300">
      Router ini belum bisa mengisolir pelanggan sampai setup isolir diterapkan.
    </p>
    <AllowlistHealthWarning :router-id="router.id" :ready="router.isolir_ready" />
    <RouterLink
      v-if="!router.isolir_ready && canSetup"
      :to="{ name: 'mikrotik-routers', query: { setup: '1', router_id: router.id } }"
      class="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900"
      >Jalankan Setup</RouterLink
    >
  </BaseCard>

  <BaseCard data-card="secrets">
    <h3 class="font-semibold">Secret PPPoE</h3>
    <p v-if="summaryLoading" class="mt-4 text-sm text-gray-500">Memuat...</p>
    <p v-else-if="summaryError || !summary" class="mt-4 text-sm text-red-600" role="alert">
      Gagal memuat ringkasan router.
    </p>
    <template v-else>
      <p class="mt-3">
        <span class="text-3xl font-bold tabular-nums">{{ summary.secrets.total }}</span>
        <span class="ml-1.5 text-sm text-gray-500 dark:text-gray-400">secret di router ini</span>
      </p>
      <dl class="mt-3 space-y-2 border-t pt-3 text-sm dark:border-gray-800">
        <div v-for="row in secretRows" :key="row.label" class="flex justify-between gap-3">
          <dt class="text-gray-600 dark:text-gray-300">{{ row.label }}</dt>
          <dd class="font-medium tabular-nums">{{ row.value }}</dd>
        </div>
      </dl>
    </template>
  </BaseCard>

  <BaseCard data-card="isolated">
    <h3 class="font-semibold">Pelanggan terisolir</h3>
    <p v-if="summaryLoading" class="mt-4 text-sm text-gray-500">Memuat...</p>
    <p v-else-if="summaryError || !summary" class="mt-4 text-sm text-red-600" role="alert">
      Gagal memuat ringkasan router.
    </p>
    <template v-else>
      <p class="mt-3 text-3xl font-bold tabular-nums">{{ summary.secrets.isolated }}</p>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {{
          summary.secrets.isolated
            ? 'secret sedang memakai profile isolir'
            : 'Tidak ada pelanggan yang sedang diisolir.'
        }}
      </p>
    </template>
  </BaseCard>

  <BaseCard v-if="canReadTasks" data-card="tasks" class="sm:col-span-2">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="font-semibold">Tugas isolir di router ini</h3>
      <RouterLink
        :to="{ name: 'mikrotik-isolation', query: { tab: 'tasks', router_id: router.id } }"
        class="text-sm font-medium text-brand-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-brand-400"
        >Lihat semua tugas router ini</RouterLink
      >
    </div>
    <div v-if="summary" class="mt-3 flex flex-wrap gap-x-8 gap-y-2">
      <p>
        <span
          class="text-2xl font-bold tabular-nums"
          :class="summary.tasks.failed ? 'text-red-600 dark:text-red-400' : ''"
          >{{ summary.tasks.failed ?? 0 }}</span
        >
        <span class="ml-1.5 text-sm text-gray-500 dark:text-gray-400">gagal</span>
      </p>
      <p>
        <span class="text-2xl font-bold tabular-nums">{{ summary.tasks.pending ?? 0 }}</span>
        <span class="ml-1.5 text-sm text-gray-500 dark:text-gray-400">menunggu</span>
      </p>
    </div>
    <p v-if="failedQuery.isLoading.value" class="mt-3 text-sm text-gray-500">Memuat...</p>
    <p v-else-if="failedQuery.isError.value" class="mt-3 text-sm text-red-600" role="alert">
      Gagal memuat tugas gagal.
    </p>
    <p v-else-if="!failed.length" class="mt-3 text-sm text-gray-500 dark:text-gray-400">
      Tidak ada tugas gagal di router ini.
    </p>
    <ul
      v-else
      class="mt-3 divide-y divide-gray-100 border-t dark:divide-gray-800 dark:border-gray-800"
    >
      <li v-for="t in failed" :key="t.id" class="py-2 text-sm">
        <p class="font-medium">{{ t.secret.name || t.account.name }}</p>
        <p class="text-gray-600 dark:text-gray-300">
          {{ taskErrorAction(t.last_error_code).message }}
          {{ taskErrorAction(t.last_error_code).action }}
        </p>
      </li>
    </ul>
  </BaseCard>
</template>
