<script setup lang="ts">
import { formatRupiah } from '@/features/crm/quotations/utils/quotation-editor'

import type { IsolirInvoice } from '../types'

defineProps<{ invoices: IsolirInvoice[] }>()

// Tanggal kalender (YYYY-MM-DD) ditampilkan apa adanya, tanpa geser zona waktu.
// Nilai yang tidak bisa diparse ditampilkan mentah supaya render tidak melempar error.
function formatDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'UTC' }).format(date)
}

// Hanya http(s) yang dipakai sebagai href; skema lain (javascript:, data:) dianggap tidak ada.
function safePayUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : ''
}
</script>

<template>
  <ul class="grid gap-3">
    <li
      v-for="inv in invoices"
      :key="inv.number"
      class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
    >
      <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ inv.number }}</p>
      <p class="mt-1 text-xs text-gray-500">Jatuh tempo {{ formatDate(inv.due_date) }}</p>
      <p class="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
        {{ formatRupiah(inv.balance) }}
      </p>
      <a
        v-if="safePayUrl(inv.pay_url)"
        :href="safePayUrl(inv.pay_url)"
        class="mt-3 flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white"
      >
        Bayar
      </a>
      <p v-else class="mt-3 text-sm text-gray-600 dark:text-gray-400">
        Hubungi kami untuk membayar tagihan ini.
      </p>
    </li>
  </ul>
</template>
