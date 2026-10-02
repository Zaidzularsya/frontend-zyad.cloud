<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { FileText } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'

import type { QuotationStatus } from '@/features/crm/quotations/api/quotations.api'
import { useQuotationsQuery } from '@/features/crm/quotations/api/quotations.queries'
import { formatRupiah } from '@/features/crm/quotations/utils/quotation-editor'

const route = useRoute()
// Prefix menu (tenant atau platform) diambil dari path saat ini.
const base = computed(() => route.path.replace(/quotations\/?$/, ''))

const statusFilter = ref<QuotationStatus | 'all'>('all')
const params = computed(() => ({
  page: 1,
  per_page: 50,
  status: statusFilter.value === 'all' ? undefined : statusFilter.value,
}))

const quotationsQuery = useQuotationsQuery(params)
const quotations = computed(() => quotationsQuery.data.value?.data ?? [])

const tabs: { value: QuotationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Terkirim' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'expired', label: 'Kedaluwarsa' },
  { value: 'superseded', label: 'Digantikan' },
]
const statusLabel = Object.fromEntries(tabs.map((t) => [t.value, t.label])) as Record<
  QuotationStatus,
  string
>

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Quotations" description="Penawaran harga ke calon customer.">
      <p class="text-sm text-gray-500">
        Buat penawaran dari halaman
        <RouterLink :to="`${base}deals`" class="font-medium text-brand-600">Deal</RouterLink>.
      </p>
    </PageHeader>

    <div class="flex gap-2 overflow-x-auto border-b">
      <button
        v-for="tab in tabs"
        :key="tab.value"
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

    <BaseCard class="!p-0">
      <div v-if="quotationsQuery.isPending.value" class="p-12 text-center text-sm text-gray-500">
        Memuat data...
      </div>
      <div v-else-if="quotations.length === 0" class="p-12 text-center text-sm text-gray-500">
        <FileText class="mx-auto mb-3 size-8 text-gray-300" />
        Belum ada quotation.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900">
            <tr>
              <th class="px-5 py-3">Nomor</th>
              <th class="px-5 py-3">Status</th>
              <th class="px-5 py-3 text-right">Total</th>
              <th class="px-5 py-3">Berlaku s.d.</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="quotation in quotations"
              :key="quotation.id"
              class="border-b last:border-0"
              :class="{ 'opacity-60': quotation.status === 'superseded' }"
            >
              <td class="px-5 py-3">
                <RouterLink
                  :to="`${base}quotations/${quotation.id}`"
                  class="font-medium text-brand-600"
                  >{{ quotation.quotation_number }}</RouterLink
                >
              </td>
              <td class="px-5 py-3">
                <span
                  class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                  {{ statusLabel[quotation.status] ?? quotation.status }}
                </span>
              </td>
              <td class="px-5 py-3 text-right tabular-nums">
                {{ formatRupiah(quotation.grand_total) }}
              </td>
              <td class="px-5 py-3">{{ formatDate(quotation.valid_until) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>
  </div>
</template>
