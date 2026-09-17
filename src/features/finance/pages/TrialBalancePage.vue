<script setup lang="ts">
import { ref } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { useFinanceTrialBalanceQuery } from '@/features/finance/api/reports.queries'
import { formatFinanceAmount } from '@/features/finance/utils/format'

const asOfDate = ref(new Date().toISOString().slice(0, 10))
const query = useFinanceTrialBalanceQuery(asOfDate)
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Trial Balance"
      description="Neraca saldo per tanggal, memverifikasi total debit = kredit."
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

    <BaseCard v-if="query.data.value">
      <div
        class="mb-3 rounded-lg border px-4 py-2 text-sm font-medium"
        :class="
          query.data.value.is_balanced
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-200'
            : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200'
        "
      >
        {{ query.data.value.is_balanced ? 'Balance' : 'TIDAK BALANCE — periksa data jurnal' }}
      </div>

      <table class="w-full text-sm">
        <thead>
          <tr
            class="border-b text-left text-xs font-medium uppercase text-gray-500 dark:border-gray-800"
          >
            <th class="px-3 py-2">Kode</th>
            <th class="px-3 py-2">Nama Akun</th>
            <th class="px-3 py-2 text-right">Debit</th>
            <th class="px-3 py-2 text-right">Kredit</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="line in query.data.value.lines"
            :key="line.account_id"
            class="border-b last:border-0 dark:border-gray-800"
          >
            <td class="px-3 py-2">{{ line.account_code }}</td>
            <td class="px-3 py-2">{{ line.account_name }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ formatFinanceAmount(line.debit) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">
              {{ formatFinanceAmount(line.credit) }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="border-t-2 font-bold dark:border-gray-700">
            <td class="px-3 py-2" colspan="2">Total</td>
            <td class="px-3 py-2 text-right tabular-nums">
              {{ formatFinanceAmount(query.data.value.total_debit) }}
            </td>
            <td class="px-3 py-2 text-right tabular-nums">
              {{ formatFinanceAmount(query.data.value.total_credit) }}
            </td>
          </tr>
        </tfoot>
      </table>
    </BaseCard>
  </div>
</template>
