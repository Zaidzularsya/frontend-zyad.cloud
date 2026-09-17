<script setup lang="ts">
import { computed, reactive } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { useFinanceTaxSummaryQuery } from '@/features/finance/api/tax.queries'
import { formatFinanceAmount } from '@/features/finance/utils/format'

function firstDayOfMonth(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}

function lastDayOfMonth(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
}

const filters = reactive({ start_date: firstDayOfMonth(), end_date: lastDayOfMonth() })
const params = computed(() => ({ start_date: filters.start_date, end_date: filters.end_date }))
const summaryQuery = useFinanceTaxSummaryQuery(params)
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Ringkasan Pajak"
      description="Agregasi pajak bertambah/berkurang per jenis untuk suatu periode — dasar penyusunan SPT Masa."
    />

    <BaseCard>
      <div class="mb-4 flex flex-wrap items-end gap-3">
        <label class="text-sm font-medium">
          Dari
          <input
            v-model="filters.start_date"
            type="date"
            class="mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
        <label class="text-sm font-medium">
          Sampai
          <input
            v-model="filters.end_date"
            type="date"
            class="mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
      </div>

      <table class="w-full text-sm">
        <thead>
          <tr
            class="border-b text-left text-xs font-medium uppercase text-gray-500 dark:border-gray-800"
          >
            <th class="px-3 py-2">Jenis Pajak</th>
            <th class="px-3 py-2 text-right">Bertambah</th>
            <th class="px-3 py-2 text-right">Berkurang</th>
            <th class="px-3 py-2 text-right">Net</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in summaryQuery.data.value?.rows ?? []"
            :key="row.tax_type_id"
            class="border-b last:border-0 dark:border-gray-800"
          >
            <td class="px-3 py-2">{{ row.tax_type_code }} — {{ row.tax_type_name }}</td>
            <td class="px-3 py-2 text-right tabular-nums">
              {{ formatFinanceAmount(row.increase) }}
            </td>
            <td class="px-3 py-2 text-right tabular-nums">
              {{ formatFinanceAmount(row.decrease) }}
            </td>
            <td class="px-3 py-2 text-right font-medium tabular-nums">
              {{ formatFinanceAmount(row.net) }}
            </td>
          </tr>
        </tbody>
      </table>
    </BaseCard>
  </div>
</template>
