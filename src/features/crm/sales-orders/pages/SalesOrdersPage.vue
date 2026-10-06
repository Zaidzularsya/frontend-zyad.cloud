<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ClipboardList, Search } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import DataPagination from '@/components/ui/DataPagination.vue'
import type { SalesOrderStatus } from '@/features/crm/sales-orders/api/sales-orders.api'
import { useSalesOrdersQuery } from '@/features/crm/sales-orders/api/sales-orders.queries'
import {
  BILLING_STATUS,
  SO_STATUS,
  TONE_CLASS,
} from '@/features/crm/sales-orders/utils/sales-order'
import { formatRupiah } from '@/features/crm/quotations/utils/quotation-editor'

const route = useRoute()
const base = computed(() => route.path.replace(/\/sales\/orders\/?$/, ''))
const statusFilter = ref<SalesOrderStatus | 'all'>('all')
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
watch([statusFilter, search, perPage], () => {
  page.value = 1
})

const params = computed(() => ({
  page: page.value,
  per_page: perPage.value,
  status: statusFilter.value === 'all' ? undefined : statusFilter.value,
  search: search.value || undefined,
}))
const query = useSalesOrdersQuery(params)
const orders = computed(() => query.data.value?.data ?? [])
const total = computed(() => query.data.value?.meta?.total ?? 0)

const tabs: { value: SalesOrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua' },
  ...(['draft', 'confirmed', 'completed', 'cancelled'] as const).map((value) => ({
    value,
    label: SO_STATUS[value].label,
  })),
]
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Sales Orders"
      description="Order hasil penawaran yang disetujui: lengkapi data penagihan lalu konfirmasi."
    />
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
    <label class="relative block w-full max-w-xs text-sm">
      <span class="sr-only">Cari sales order</span>
      <Search class="pointer-events-none absolute left-3 top-2.5 size-4 text-gray-400" />
      <input
        v-model="searchInput"
        name="search"
        placeholder="Nomor SO, penawaran, atau pelanggan"
        class="w-full rounded-lg border bg-white py-2 pl-9 pr-3 outline-none focus:border-brand-500 dark:bg-gray-950"
      />
    </label>

    <BaseCard class="!p-0">
      <div v-if="query.isPending.value" class="p-12 text-center text-sm text-gray-500">
        Memuat data...
      </div>
      <div v-else-if="orders.length === 0" class="p-12 text-center text-sm text-gray-500">
        <ClipboardList class="mx-auto mb-3 size-8 text-gray-300" />
        Belum ada sales order yang cocok.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[820px] text-left text-sm">
          <thead class="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900">
            <tr>
              <th class="px-5 py-3">Nomor</th>
              <th class="px-5 py-3">Pelanggan</th>
              <th class="px-5 py-3">Status</th>
              <th class="px-5 py-3">Penagihan</th>
              <th class="px-5 py-3 text-right">Total</th>
              <th class="px-5 py-3 text-right">Tagihan pertama</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="so in orders" :key="so.id" class="border-b last:border-0">
              <td class="px-5 py-3">
                <RouterLink
                  :to="`${base}/sales/orders/${so.id}`"
                  class="font-medium text-brand-600"
                  >{{ so.so_number }}</RouterLink
                >
                <p class="text-xs text-gray-500">{{ so.quotation_number }}</p>
              </td>
              <td class="px-5 py-3">{{ so.bill_to_company || so.bill_to_name || '-' }}</td>
              <td class="px-5 py-3">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="TONE_CLASS[SO_STATUS[so.status].tone]"
                  >{{ SO_STATUS[so.status].label }}</span
                >
              </td>
              <td class="px-5 py-3">
                <span
                  v-if="so.status !== 'draft' && so.status !== 'cancelled'"
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="TONE_CLASS[BILLING_STATUS[so.billing_status].tone]"
                  >{{ BILLING_STATUS[so.billing_status].label }}</span
                >
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="px-5 py-3 text-right">{{ formatRupiah(so.grand_total) }}</td>
              <td class="px-5 py-3 text-right">{{ formatRupiah(so.first_invoice_total) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>
    <DataPagination v-model:page="page" v-model:per-page="perPage" :total="total" />
  </div>
</template>
