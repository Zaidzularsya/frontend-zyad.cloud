<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Wallet } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import DataPagination from '@/components/ui/DataPagination.vue'
import { formatRupiah } from '@/features/crm/quotations/utils/quotation-editor'
import { usePaymentsQuery } from '@/features/receivable/api/receivable.queries'

const route = useRoute()
const base = computed(() => route.path.replace(/\/payments\/?$/, ''))

const page = ref(1)
const perPage = ref(20)
watch(perPage, () => {
  page.value = 1
})
const paymentsQuery = usePaymentsQuery(
  computed(() => ({ page: page.value, per_page: perPage.value })),
)
const payments = computed(() => paymentsQuery.data.value?.data ?? [])
const total = computed(() => paymentsQuery.data.value?.meta?.total ?? 0)

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Pembayaran" description="Riwayat pembayaran atas invoice pelanggan." />
    <BaseCard class="!p-0">
      <div v-if="paymentsQuery.isPending.value" class="p-12 text-center text-sm text-gray-500">
        Memuat data...
      </div>
      <div v-else-if="payments.length === 0" class="p-12 text-center text-sm text-gray-500">
        <Wallet class="mx-auto mb-3 size-8 text-gray-300" />
        Belum ada pembayaran.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[640px] text-left text-sm">
          <thead class="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900">
            <tr>
              <th class="px-5 py-3">Tanggal bayar</th>
              <th class="px-5 py-3">Invoice</th>
              <th class="px-5 py-3">Pelanggan</th>
              <th class="px-5 py-3">Referensi</th>
              <th class="px-5 py-3 text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in payments" :key="p.id" class="border-b last:border-0">
              <td class="px-5 py-3">{{ formatDateTime(p.paid_at) }}</td>
              <td class="px-5 py-3">
                <RouterLink
                  :to="`${base}/invoices/${p.invoice_id}`"
                  class="font-medium text-brand-600"
                  >{{ p.invoice_number || 'Invoice' }}</RouterLink
                >
              </td>
              <td class="px-5 py-3">{{ p.account_name }}</td>
              <td class="px-5 py-3">{{ p.reference || '-' }}</td>
              <td class="px-5 py-3 text-right tabular-nums">{{ formatRupiah(p.amount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="total > 0" class="border-t p-3">
        <DataPagination
          v-model:page="page"
          v-model:per-page="perPage"
          :total="total"
          item-label="pembayaran"
        />
      </div>
    </BaseCard>
  </div>
</template>
