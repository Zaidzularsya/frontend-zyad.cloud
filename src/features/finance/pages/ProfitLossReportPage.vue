<script setup lang="ts">
import { ref } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import FinancialStatementTable from '@/features/finance/components/FinancialStatementTable.vue'
import { useFinanceProfitLossQuery } from '@/features/finance/api/reports.queries'

const today = new Date()
const startDate = ref(new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10))
const endDate = ref(today.toISOString().slice(0, 10))

const query = useFinanceProfitLossQuery(startDate, endDate)
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Laporan Laba Rugi"
      description="Ringkasan pendapatan dan beban untuk periode yang dipilih."
    />

    <BaseCard>
      <div class="flex flex-wrap items-end gap-3">
        <label class="text-sm font-medium">
          Dari
          <input
            v-model="startDate"
            type="date"
            class="mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
        <label class="text-sm font-medium">
          Sampai
          <input
            v-model="endDate"
            type="date"
            class="mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
      </div>
    </BaseCard>

    <BaseCard v-if="query.data.value">
      <FinancialStatementTable
        :sections="query.data.value.sections"
        total-label="Laba (Rugi) Bersih"
        :total="query.data.value.net_income"
      />
    </BaseCard>
  </div>
</template>
