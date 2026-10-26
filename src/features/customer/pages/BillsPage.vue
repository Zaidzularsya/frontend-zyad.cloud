<script setup lang="ts">
import { onMounted, ref } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { selfServeApi, type BillsView } from '@/features/customer/api/self-serve.api'
import {
  formatDay,
  invoiceStatusLabel,
  isPayable,
} from '@/features/customer/utils/subscription-view'
import { formatCurrency } from '@/lib/utils'

const view = ref<BillsView | null>(null)
const loading = ref(true)
const loadError = ref('')

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    view.value = await selfServeApi.bills()
  } catch {
    loadError.value = 'Gagal memuat tagihan. Coba lagi.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function money(value: string) {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? value : formatCurrency(parsed)
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Tagihan"
      description="Tagihan yang diterbitkan penjual paket untuk workspace ini."
    />

    <div v-if="loading" class="space-y-3" data-testid="bills-loading">
      <div class="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-900"></div>
    </div>

    <div
      v-else-if="loadError"
      class="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      role="alert"
      data-testid="bills-error"
    >
      <span>{{ loadError }}</span>
      <BaseButton variant="outline" data-testid="bills-reload" @click="load">Muat ulang</BaseButton>
    </div>

    <BaseCard v-else-if="view">
      <p v-if="view.seller" class="text-sm text-gray-500" data-testid="bills-seller">
        Penjual:
        <span class="font-semibold text-gray-900 dark:text-gray-100">{{ view.seller.name }}</span>
      </p>
      <p v-if="!view.invoices.length" class="mt-3 text-sm text-gray-500" data-testid="bills-empty">
        Belum ada tagihan untuk workspace ini.
      </p>
      <div v-else class="mt-3 overflow-x-auto">
        <table class="w-full text-left text-sm" data-testid="bills-table">
          <thead class="text-xs uppercase text-gray-500">
            <tr>
              <th class="py-2 pr-4 font-medium">Nomor</th>
              <th class="py-2 pr-4 font-medium">Periode</th>
              <th class="py-2 pr-4 font-medium">Jatuh tempo</th>
              <th class="py-2 pr-4 text-right font-medium">Total</th>
              <th class="py-2 pr-4 font-medium">Status</th>
              <th class="py-2 font-medium"><span class="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-for="invoice in view.invoices" :key="invoice.number">
              <td class="py-2 pr-4 font-medium">{{ invoice.number }}</td>
              <td class="py-2 pr-4">{{ invoice.period_label || '-' }}</td>
              <td class="py-2 pr-4">{{ formatDay(invoice.due_date) }}</td>
              <td class="py-2 pr-4 text-right tabular-nums">{{ money(invoice.total) }}</td>
              <td class="py-2 pr-4">{{ invoiceStatusLabel(invoice.status) }}</td>
              <td class="py-2 text-right">
                <a
                  v-if="isPayable(invoice.status) && invoice.url"
                  :href="invoice.url"
                  class="font-semibold text-brand-600 hover:underline"
                  data-testid="pay-link"
                  >Bayar</a
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>
  </div>
</template>
