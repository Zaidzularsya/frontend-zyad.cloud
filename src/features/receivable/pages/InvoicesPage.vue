<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { AlertTriangle, Plus, Receipt, Search } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import DataPagination from '@/components/ui/DataPagination.vue'
import { formatRupiah } from '@/features/crm/quotations/utils/quotation-editor'
import type { InvoiceStatus } from '@/features/receivable/api/receivable.api'
import { useInvoicesQuery } from '@/features/receivable/api/receivable.queries'
import { INVOICE_STATUS } from '@/features/receivable/utils/invoice-status'
import { useAuthStore } from '@/stores/auth.store'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
// Prefix menu (tenant /app/billing atau platform) diambil dari path saat ini.
const base = computed(() => route.path.replace(/\/invoices\/?$/, ''))

const statusFilter = ref<InvoiceStatus | 'all'>('all')
const sendFailed = ref(false)
const searchInput = ref('')
const search = ref('')
const page = ref(1)
const perPage = ref(20)

let timer: ReturnType<typeof setTimeout> | undefined
watch(searchInput, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    search.value = value.trim()
  }, 300)
})
onBeforeUnmount(() => clearTimeout(timer))
watch([statusFilter, sendFailed, search, perPage], () => {
  page.value = 1
})

const params = computed(() => ({
  page: page.value,
  per_page: perPage.value,
  status: statusFilter.value === 'all' ? undefined : statusFilter.value,
  send_failed: sendFailed.value || undefined,
  search: search.value || undefined,
}))
const invoicesQuery = useInvoicesQuery(params)
const invoices = computed(() => invoicesQuery.data.value?.data ?? [])
const total = computed(() => invoicesQuery.data.value?.meta?.total ?? 0)

const tabs: { value: InvoiceStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua' },
  ...(['draft', 'issued', 'overdue', 'paid', 'void'] as const).map((value) => ({
    value,
    label: INVOICE_STATUS[value].label,
  })),
]

const toneClass: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200',
  green: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
  red: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200',
  slate: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
    new Date(`${value.slice(0, 10)}T00:00:00`),
  )
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Invoice"
      description="Tagihan ke pelanggan: terbitkan, kirim, dan catat pembayaran."
    >
      <BaseButton v-if="auth.can('invoice.create')" @click="router.push(`${base}/invoices/new`)">
        <Plus class="size-4" /> Invoice baru
      </BaseButton>
    </PageHeader>

    <div class="flex gap-2 overflow-x-auto border-b">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        class="border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap"
        :class="
          statusFilter === tab.value
            ? 'border-brand-500 text-brand-600 font-semibold'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        "
        @click="statusFilter = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-4 text-sm">
      <label class="relative block w-full max-w-xs">
        <span class="sr-only">Cari invoice</span>
        <Search class="pointer-events-none absolute left-3 top-2.5 size-4 text-gray-400" />
        <input
          v-model="searchInput"
          name="search"
          placeholder="Nomor atau pelanggan"
          class="w-full rounded-lg border bg-white py-2 pl-9 pr-3 outline-none focus:border-brand-500 dark:bg-gray-950"
        />
      </label>
      <label class="flex items-center gap-2">
        <input v-model="sendFailed" type="checkbox" name="send_failed" />
        Kiriman gagal
      </label>
    </div>

    <BaseCard class="!p-0">
      <div v-if="invoicesQuery.isPending.value" class="p-12 text-center text-sm text-gray-500">
        Memuat data...
      </div>
      <div v-else-if="invoices.length === 0" class="p-12 text-center text-sm text-gray-500">
        <Receipt class="mx-auto mb-3 size-8 text-gray-300" />
        Belum ada invoice yang cocok.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[860px] text-left text-sm">
          <thead class="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900">
            <tr>
              <th class="px-5 py-3">Nomor</th>
              <th class="px-5 py-3">Pelanggan</th>
              <th class="px-5 py-3">Terbit</th>
              <th class="px-5 py-3">Jatuh tempo</th>
              <th class="px-5 py-3 text-right">Total</th>
              <th class="px-5 py-3 text-right">Sisa</th>
              <th class="px-5 py-3">Status</th>
              <th class="px-5 py-3">Kiriman terakhir</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="inv in invoices"
              :key="inv.id"
              class="border-b last:border-0"
              :class="{ 'opacity-60': inv.status === 'void' }"
            >
              <td class="px-5 py-3">
                <RouterLink :to="`${base}/invoices/${inv.id}`" class="font-medium text-brand-600">{{
                  inv.invoice_number ?? 'Draft'
                }}</RouterLink>
              </td>
              <td class="px-5 py-3">
                {{ inv.account.name }}
                <span v-if="inv.account.company_name" class="block text-xs text-gray-500">{{
                  inv.account.company_name
                }}</span>
              </td>
              <td class="px-5 py-3">{{ formatDate(inv.issue_date) }}</td>
              <td class="px-5 py-3">{{ formatDate(inv.due_date) }}</td>
              <td class="px-5 py-3 text-right tabular-nums">{{ formatRupiah(inv.grand_total) }}</td>
              <td class="px-5 py-3 text-right tabular-nums">
                {{ inv.status === 'draft' ? '-' : formatRupiah(inv.balance) }}
              </td>
              <td class="px-5 py-3">
                <span
                  class="rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="toneClass[INVOICE_STATUS[inv.status].tone]"
                  >{{ INVOICE_STATUS[inv.status].label }}</span
                >
              </td>
              <td class="px-5 py-3 text-xs">
                <template v-if="inv.last_send">
                  <span
                    v-if="inv.last_send.status === 'failed'"
                    class="inline-flex items-center gap-1 text-red-600"
                    :title="inv.last_send.error"
                  >
                    <AlertTriangle class="size-3.5" /> Gagal ({{
                      inv.last_send.channel === 'email' ? 'Email' : 'WhatsApp'
                    }})
                  </span>
                  <span v-else class="text-green-700 dark:text-green-400"
                    >Terkirim ({{ inv.last_send.channel === 'email' ? 'Email' : 'WhatsApp' }})</span
                  >
                </template>
                <span v-else class="text-gray-400">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="total > 0" class="border-t p-3">
        <DataPagination
          v-model:page="page"
          v-model:per-page="perPage"
          :total="total"
          item-label="invoice"
        />
      </div>
    </BaseCard>
  </div>
</template>
