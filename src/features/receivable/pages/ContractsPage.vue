<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { FileSignature, Search } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import DataPagination from '@/components/ui/DataPagination.vue'
import type { ContractStatus } from '@/features/receivable/api/receivable.api'
import { useContractsQuery } from '@/features/receivable/api/receivable.queries'
import { CONTRACT_STATUS } from '@/features/receivable/utils/contract'
import { TONE_CLASS } from '@/features/crm/sales-orders/utils/sales-order'

const route = useRoute()
const base = computed(() => route.path.replace(/\/sales\/contracts\/?$/, ''))
const statusFilter = ref<ContractStatus | 'all'>('all')
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
const query = useContractsQuery(params)
const contracts = computed(() => query.data.value?.data ?? [])
const total = computed(() => query.data.value?.meta?.total ?? 0)

const tabs: { value: ContractStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua' },
  ...(['active', 'ended', 'cancelled'] as const).map((value) => ({
    value,
    label: CONTRACT_STATUS[value].label,
  })),
]

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
        new Date(`${value.slice(0, 10)}T00:00:00`),
      )
    : '-'
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Contracts"
      description="Kontrak tagihan berulang dari sales order yang dikonfirmasi."
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
      <span class="sr-only">Cari kontrak</span>
      <Search class="pointer-events-none absolute left-3 top-2.5 size-4 text-gray-400" />
      <input
        v-model="searchInput"
        name="search"
        placeholder="Nomor atau pelanggan"
        class="w-full rounded-lg border bg-white py-2 pl-9 pr-3 outline-none focus:border-brand-500 dark:bg-gray-950"
      />
    </label>
    <BaseCard class="!p-0">
      <div v-if="query.isPending.value" class="p-12 text-center text-sm text-gray-500">
        Memuat data...
      </div>
      <div v-else-if="contracts.length === 0" class="p-12 text-center text-sm text-gray-500">
        <FileSignature class="mx-auto mb-3 size-8 text-gray-300" />
        Belum ada kontrak yang cocok.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[720px] text-left text-sm">
          <thead class="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900">
            <tr>
              <th class="px-5 py-3">Nomor</th>
              <th class="px-5 py-3">Pelanggan</th>
              <th class="px-5 py-3">Mulai</th>
              <th class="px-5 py-3">Berakhir</th>
              <th class="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in contracts" :key="c.id" class="border-b last:border-0">
              <td class="px-5 py-3">
                <RouterLink
                  :to="`${base}/sales/contracts/${c.id}`"
                  class="font-medium text-brand-600"
                  >{{ c.contract_number }}</RouterLink
                >
              </td>
              <td class="px-5 py-3">{{ c.account.company_name || c.account.name }}</td>
              <td class="px-5 py-3">{{ formatDate(c.start_date) }}</td>
              <td class="px-5 py-3">{{ formatDate(c.end_date) }}</td>
              <td class="px-5 py-3">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="TONE_CLASS[CONTRACT_STATUS[c.status].tone]"
                  >{{ CONTRACT_STATUS[c.status].label }}</span
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>
    <DataPagination
      v-model:page="page"
      v-model:per-page="perPage"
      :total="total"
      item-label="kontrak"
    />
  </div>
</template>
