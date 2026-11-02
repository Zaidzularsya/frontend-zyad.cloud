<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import DataPagination from '@/components/ui/DataPagination.vue'
import { useToast } from '@/components/ui/toast'
import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import { usePreviewQuery } from '@/features/mikrotik/api/mikrotik.queries'
import ExemptUntilDialog from '@/features/mikrotik/components/ExemptUntilDialog.vue'
import type {
  PreviewItem,
  PreviewParams,
  PreviewStatus,
  PreviewSummary,
} from '@/features/mikrotik/types'
import { CONTROL_OWNER_ONLY_TOOLTIP } from '@/features/mikrotik/utils/control-permissions'
import { routerActionError } from '@/features/mikrotik/utils/errors'
import {
  blockedTooltip,
  downloadBlob,
  exemptionLabel,
  isBlocked,
  statusLabel,
  wibToday,
  type StatusTone,
} from '@/features/mikrotik/utils/preview'

const props = defineProps<{ summary: PreviewSummary; canUpdate: boolean }>()
const emit = defineEmits<{ (e: 'exempted', accountId: string): void }>()

const toast = useToast()

const STATUS_FILTERS: { value: PreviewStatus; label: string }[] = [
  { value: 'will_isolate', label: 'Siap diisolir' },
  { value: 'exempt', label: 'Dikecualikan' },
  { value: 'already_isolated', label: 'Sudah terisolir' },
  { value: 'secret_missing', label: 'Secret tidak ditemukan' },
  { value: 'no_secret', label: 'Belum ada secret' },
  { value: 'needs_profile', label: 'Perlu profile asal' },
  { value: 'router_not_ready', label: 'Router belum siap' },
]

const status = ref<PreviewStatus | ''>('')
const searchInput = ref('')
const q = ref('')
const page = ref(1)
const perPage = ref(20)

// Pencarian ditunda sebentar agar tidak memanggil API di setiap ketukan.
let debounce: ReturnType<typeof setTimeout> | undefined
watch(searchInput, (v) => {
  clearTimeout(debounce)
  debounce = setTimeout(() => (q.value = v.trim()), 300)
})
onBeforeUnmount(() => clearTimeout(debounce))
watch([status, q, perPage], () => (page.value = 1))

const filters = computed(() => ({
  ...(status.value ? { status: status.value } : {}),
  ...(q.value ? { q: q.value } : {}),
}))
const params = computed<PreviewParams>(() => ({
  ...filters.value,
  page: page.value,
  per_page: perPage.value,
}))

const query = usePreviewQuery(params)
const rows = computed(() => query.data.value?.data ?? [])
const total = computed(() => query.data.value?.meta?.total ?? 0)

const TONE_CLASS: Record<StatusTone, string> = {
  ok: 'bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200',
  neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  danger: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
}

function reasonText(row: PreviewItem): string {
  if (row.status === 'will_isolate' || row.overdue_days > 0)
    return `Tunggakan ${row.overdue_days} hari`
  return '-'
}

// Tooltip pada tombol Kecualikan: izin dulu, lalu alasan baris diblokir.
function actionHint(row: PreviewItem): string | undefined {
  if (!props.canUpdate) return CONTROL_OWNER_ONLY_TOOLTIP
  if (isBlocked(row.status)) return blockedTooltip(row.status)
  return undefined
}

const target = ref<PreviewItem | null>(null)
const dialogOpen = ref(false)
function openDialog(row: PreviewItem) {
  target.value = row
  dialogOpen.value = true
}
function onSaved() {
  if (target.value) emit('exempted', target.value.account_id)
}

const exporting = ref(false)
async function exportCsv() {
  exporting.value = true
  try {
    const blob = await mikrotikApi.control.exportPreview(filters.value)
    downloadBlob(blob, `kandidat-isolir-${wibToday()}.csv`)
  } catch (error) {
    toast.error(routerActionError(error))
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <section class="space-y-4" aria-label="Daftar eksekusi isolir">
    <dl class="grid grid-cols-2 gap-3 sm:max-w-xl">
      <div class="rounded-xl border p-4">
        <dt class="text-sm text-gray-600 dark:text-gray-400">Target Isolir</dt>
        <dd class="text-3xl font-semibold tabular-nums" data-testid="count-target">
          {{ summary.target }}
        </dd>
      </div>
      <div class="rounded-xl border p-4">
        <dt class="text-sm text-gray-600 dark:text-gray-400">Aman/Dikecualikan</dt>
        <dd class="text-3xl font-semibold tabular-nums" data-testid="count-safe">
          {{ summary.safe }}
        </dd>
      </div>
    </dl>

    <div class="flex flex-wrap items-end gap-2">
      <label class="text-sm">
        <span class="mb-1 block font-medium">Status</span>
        <select
          v-model="status"
          name="status"
          class="rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950"
        >
          <option value="">Semua status</option>
          <option v-for="s in STATUS_FILTERS" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </label>
      <label class="min-w-48 flex-1 text-sm">
        <span class="mb-1 block font-medium">Cari pelanggan</span>
        <input
          v-model="searchInput"
          name="q"
          type="search"
          placeholder="Nama atau nomor HP"
          class="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:bg-gray-950 dark:focus:ring-brand-900"
        />
      </label>
      <BaseButton variant="outline" :disabled="exporting" @click="exportCsv">
        {{ exporting ? 'Menyiapkan...' : 'Ekspor CSV' }}
      </BaseButton>
    </div>

    <p v-if="query.isPending.value" class="text-sm text-gray-600" role="status">Memuat daftar...</p>
    <p v-else-if="query.isError.value" class="text-sm text-red-700" role="alert">
      Gagal memuat daftar kandidat.
      <button type="button" class="font-medium underline" @click="query.refetch()">
        Coba lagi
      </button>
    </p>
    <p v-else-if="rows.length === 0" class="rounded-xl border p-6 text-sm text-gray-600">
      Tidak ada pelanggan yang cocok dengan filter ini.
    </p>
    <div v-else class="overflow-hidden rounded-xl border">
      <table class="w-full text-left text-sm">
        <thead
          class="sticky top-0 z-10 hidden border-b bg-gray-50 text-xs text-gray-600 md:table-header-group dark:bg-gray-900 dark:text-gray-400"
        >
          <tr>
            <th scope="col" class="px-4 py-3">Pelanggan &amp; Paket</th>
            <th scope="col" class="px-4 py-3">Alasan Isolir</th>
            <th scope="col" class="px-4 py-3">Status Secret di Router</th>
            <th scope="col" class="px-4 py-3">Status Pengecualian</th>
            <th scope="col" class="px-4 py-3"><span class="sr-only">Aksi</span></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.account_id"
            class="block border-b align-top last:border-0 md:table-row"
            :class="isBlocked(row.status) ? 'bg-red-50 dark:bg-red-950/30' : ''"
            :data-status="row.status"
          >
            <td class="block px-4 py-2 md:table-cell md:py-3">
              <span class="font-medium">{{ row.account_name }}</span>
              <span class="block text-xs text-gray-600 dark:text-gray-400">{{
                row.products || '-'
              }}</span>
            </td>
            <td class="block px-4 py-1 md:table-cell md:py-3">
              <span class="text-xs text-gray-600 md:hidden dark:text-gray-400"
                >Alasan Isolir:
              </span>
              {{ reasonText(row) }}
              <span
                v-if="row.oldest_invoice_number"
                class="block text-xs text-gray-600 dark:text-gray-400"
                >Invoice tertua {{ row.oldest_invoice_number }}</span
              >
            </td>
            <td class="block px-4 py-1 md:table-cell md:py-3">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="TONE_CLASS[statusLabel(row.status).tone]"
                >{{ statusLabel(row.status).text }}</span
              >
            </td>
            <td class="block px-4 py-1 md:table-cell md:py-3">
              {{ exemptionLabel(row.exempted_until)
              }}{{ !row.exempted_until && row.status === 'exempt' ? 'Dikecualikan' : '' }}
            </td>
            <td class="block px-4 py-2 md:table-cell md:py-3 md:text-right">
              <button
                type="button"
                class="min-h-11 rounded-lg border px-3 py-1 text-xs font-medium hover:bg-gray-50 focus-visible:ring-4 focus-visible:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60 md:min-h-0 dark:hover:bg-gray-800"
                :disabled="!canUpdate || isBlocked(row.status)"
                :title="actionHint(row)"
                :aria-label="`${row.exempted_until ? 'Ubah pengecualian' : 'Kecualikan'} ${row.account_name}`"
                @click="openDialog(row)"
              >
                {{ row.exempted_until ? 'Ubah' : 'Kecualikan' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <DataPagination
        :page="page"
        :per-page="perPage"
        :total="total"
        item-label="pelanggan"
        @update:page="page = $event"
        @update:per-page="perPage = $event"
      />
    </div>

    <ExemptUntilDialog
      :open="dialogOpen"
      :account-id="target?.account_id ?? ''"
      :account-name="target?.account_name"
      @close="dialogOpen = false"
      @saved="onSaved"
    />
  </section>
</template>
