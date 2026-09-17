<script setup lang="ts">
import { computed, ref } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { useFinanceBalanceSheetQuery } from '@/features/finance/api/reports.queries'
import { useFinanceProfitLossQuery } from '@/features/finance/api/reports.queries'
import { formatFinanceAmount } from '@/features/finance/utils/format'

const today = new Date()
const yearStart = ref(new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10))
const todayStr = ref(today.toISOString().slice(0, 10))

const profitLossQuery = useFinanceProfitLossQuery(yearStart, todayStr)
const balanceSheetQuery = useFinanceBalanceSheetQuery(todayStr)

const netIncome = computed(() => profitLossQuery.data.value?.net_income ?? '0')
const totalAssets = computed(() => balanceSheetQuery.data.value?.total_assets ?? '0')
const isBalanced = computed(() => balanceSheetQuery.data.value?.is_balanced ?? true)
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Finance Dashboard"
      description="Ringkasan pembukuan PT Zyad Technovation tahun berjalan."
    />

    <div class="grid gap-4 sm:grid-cols-3">
      <BaseCard>
        <p class="text-sm text-gray-500">Laba (Rugi) Tahun Berjalan</p>
        <p class="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">
          {{ formatFinanceAmount(netIncome) }}
        </p>
      </BaseCard>
      <BaseCard>
        <p class="text-sm text-gray-500">Total Aset</p>
        <p class="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">
          {{ formatFinanceAmount(totalAssets) }}
        </p>
      </BaseCard>
      <BaseCard>
        <p class="text-sm text-gray-500">Status Neraca</p>
        <p class="mt-1 text-xl font-bold" :class="isBalanced ? 'text-emerald-600' : 'text-red-600'">
          {{ isBalanced ? 'Balance' : 'Tidak Balance' }}
        </p>
      </BaseCard>
    </div>
  </div>
</template>
