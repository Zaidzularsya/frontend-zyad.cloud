<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Landmark } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import DataPagination from '@/components/ui/DataPagination.vue'
import { formatRupiah } from '@/features/crm/quotations/utils/quotation-editor'
import {
  useOwnBalanceQuery,
  useOwnEntriesQuery,
} from '@/features/settlement/api/settlement.queries'
import { entryKindLabel } from '@/features/settlement/utils/settlement'

const route = useRoute()
const base = computed(() => route.path.replace(/\/settlement\/?$/, ''))

const balanceQuery = useOwnBalanceQuery()
const balance = computed(() => balanceQuery.data.value)

const page = ref(1)
const perPage = ref(20)
watch(perPage, () => {
  page.value = 1
})
const entriesQuery = useOwnEntriesQuery(
  computed(() => ({ page: page.value, per_page: perPage.value })),
)
const entries = computed(() => entriesQuery.data.value?.data ?? [])
const total = computed(() => entriesQuery.data.value?.meta?.total ?? 0)

const cards = computed(() => [
  { key: 'paid_in', label: 'Masuk', value: balance.value?.paid_in },
  { key: 'settled', label: 'Disetor', value: balance.value?.settled },
  { key: 'adjusted', label: 'Penyesuaian', value: balance.value?.adjusted },
  { key: 'balance', label: 'Sisa', value: balance.value?.balance },
])

const badgeClass: Record<string, string> = {
  payment: 'bg-blue-50 text-blue-700',
  settlement: 'bg-green-50 text-green-700',
  adjustment: 'bg-amber-50 text-amber-700',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(
    new Date(value),
  )
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Saldo Pembayaran"
      description="Pembayaran online masuk ke rekening Zyad dan disetorkan manual. Halaman ini hanya untuk dibaca."
    />

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <BaseCard v-for="c in cards" :key="c.key">
        <p class="text-xs uppercase text-gray-500">{{ c.label }}</p>
        <p class="mt-1 text-xl font-semibold tabular-nums">
          {{ c.value === undefined ? '-' : formatRupiah(c.value) }}
        </p>
      </BaseCard>
    </div>

    <BaseCard class="!p-0">
      <div v-if="entriesQuery.isPending.value" class="p-12 text-center text-sm text-gray-500">
        Memuat data...
      </div>
      <div v-else-if="entries.length === 0" class="p-12 text-center text-sm text-gray-500">
        <Landmark class="mx-auto mb-3 size-8 text-gray-300" />
        Belum ada transaksi.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[640px] text-left text-sm">
          <thead class="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900">
            <tr>
              <th class="px-5 py-3">Tanggal</th>
              <th class="px-5 py-3">Jenis</th>
              <th class="px-5 py-3 text-right">Jumlah</th>
              <th class="px-5 py-3">Catatan</th>
              <th class="px-5 py-3">Invoice</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in entries" :key="e.id" class="border-b last:border-0">
              <td class="px-5 py-3">{{ formatDate(e.occurred_at) }}</td>
              <td class="px-5 py-3">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="badgeClass[e.kind] ?? 'bg-gray-100 text-gray-700'"
                >
                  {{ entryKindLabel(e.kind) }}
                </span>
              </td>
              <td class="px-5 py-3 text-right tabular-nums">{{ formatRupiah(e.amount) }}</td>
              <td class="px-5 py-3">{{ e.note || '-' }}</td>
              <td class="px-5 py-3">
                <RouterLink
                  v-if="e.invoice_id"
                  :to="`${base}/invoices/${e.invoice_id}`"
                  class="font-medium text-brand-600"
                  >{{ e.provider_reference || 'Lihat invoice' }}</RouterLink
                >
                <span v-else>-</span>
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
          item-label="transaksi"
        />
      </div>
    </BaseCard>
  </div>
</template>
