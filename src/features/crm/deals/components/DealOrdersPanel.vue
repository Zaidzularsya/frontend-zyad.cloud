<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { useDealSalesOrdersQuery } from '@/features/crm/sales-orders/api/sales-orders.queries'
import {
  BILLING_STATUS,
  SO_STATUS,
  TONE_CLASS,
} from '@/features/crm/sales-orders/utils/sales-order'
import { formatRupiah } from '@/features/crm/quotations/utils/quotation-editor'

const props = defineProps<{ dealId: string; basePath: string }>()
const query = useDealSalesOrdersQuery(computed(() => props.dealId))
const orders = computed(() => query.data.value ?? [])
</script>

<template>
  <div class="space-y-3 text-sm">
    <p v-if="query.isPending.value" class="text-gray-500">Memuat data...</p>
    <p v-else-if="orders.length === 0" class="text-gray-500">
      Belum ada sales order. SO dibuat otomatis saat penawaran disetujui.
    </p>
    <article v-for="so in orders" :key="so.id" class="space-y-2 rounded-xl border p-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <RouterLink
          :to="`${basePath}/sales/orders/${so.id}`"
          class="font-semibold text-brand-600"
          >{{ so.so_number }}</RouterLink
        >
        <div class="flex gap-2 text-xs">
          <span
            class="rounded-full px-2 py-0.5 font-medium"
            :class="TONE_CLASS[SO_STATUS[so.status].tone]"
            >{{ SO_STATUS[so.status].label }}</span
          >
          <span
            v-if="so.status !== 'draft' && so.status !== 'cancelled'"
            class="rounded-full px-2 py-0.5 font-medium"
            :class="TONE_CLASS[BILLING_STATUS[so.billing_status].tone]"
            >{{ BILLING_STATUS[so.billing_status].label }}</span
          >
        </div>
      </div>
      <p class="text-gray-600">
        {{ formatRupiah(so.grand_total) }} · tagihan pertama
        {{ formatRupiah(so.first_invoice_total) }}
      </p>
      <p v-if="so.initial_invoice">
        Invoice:
        <RouterLink
          :to="`${basePath}/billing/invoices/${so.initial_invoice.id}`"
          class="text-brand-600"
          >{{ so.initial_invoice.number }}</RouterLink
        >
        <span class="text-xs text-gray-500"> ({{ so.initial_invoice.status }})</span>
      </p>
      <p v-if="so.contract">
        Kontrak:
        <RouterLink :to="`${basePath}/sales/contracts/${so.contract.id}`" class="text-brand-600">{{
          so.contract.number
        }}</RouterLink>
      </p>
    </article>
  </div>
</template>
