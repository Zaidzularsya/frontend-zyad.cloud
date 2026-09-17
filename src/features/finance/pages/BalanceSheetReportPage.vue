<script setup lang="ts">
import { ref } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import FinancialStatementTable from '@/features/finance/components/FinancialStatementTable.vue'
import { useFinanceBalanceSheetQuery } from '@/features/finance/api/reports.queries'
import { formatFinanceAmount } from '@/features/finance/utils/format'

const asOfDate = ref(new Date().toISOString().slice(0, 10))
const query = useFinanceBalanceSheetQuery(asOfDate)
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Neraca (Balance Sheet)"
      description="Posisi aset, kewajiban, dan ekuitas PT Zyad Technovation per tanggal tertentu."
    />

    <BaseCard>
      <label class="text-sm font-medium">
        Per Tanggal
        <input
          v-model="asOfDate"
          type="date"
          class="ml-2 rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        />
      </label>
    </BaseCard>

    <template v-if="query.data.value">
      <div
        class="rounded-lg border px-4 py-2 text-sm font-medium"
        :class="
          query.data.value.is_balanced
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-200'
            : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200'
        "
      >
        {{
          query.data.value.is_balanced
            ? 'Balance — Aset = Kewajiban + Ekuitas'
            : 'TIDAK BALANCE — periksa data jurnal'
        }}
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <BaseCard>
          <h2 class="mb-3 font-semibold text-gray-900 dark:text-gray-100">Aset</h2>
          <FinancialStatementTable
            :sections="query.data.value.asset_sections"
            total-label="Total Aset"
            :total="query.data.value.total_assets"
          />
        </BaseCard>

        <div class="space-y-6">
          <BaseCard>
            <h2 class="mb-3 font-semibold text-gray-900 dark:text-gray-100">Kewajiban</h2>
            <FinancialStatementTable
              :sections="query.data.value.liability_sections"
              total-label="Total Kewajiban"
              :total="query.data.value.total_liabilities"
            />
          </BaseCard>

          <BaseCard>
            <h2 class="mb-3 font-semibold text-gray-900 dark:text-gray-100">Ekuitas</h2>
            <FinancialStatementTable
              :sections="query.data.value.equity_sections"
              total-label="Total Ekuitas"
              :total="query.data.value.total_equity"
            />
          </BaseCard>
        </div>
      </div>

      <BaseCard class="flex items-center justify-between">
        <span class="font-semibold text-gray-900 dark:text-gray-100">
          Total Kewajiban + Ekuitas
        </span>
        <span class="font-bold tabular-nums">
          {{
            formatFinanceAmount(
              Number(query.data.value.total_liabilities) + Number(query.data.value.total_equity),
            )
          }}
        </span>
      </BaseCard>
    </template>
  </div>
</template>
