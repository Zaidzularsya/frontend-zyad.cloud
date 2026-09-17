<script setup lang="ts">
import type { FinanceReportSection } from '@/features/finance/api/reports.api'
import { formatFinanceAmount } from '@/features/finance/utils/format'

defineProps<{
  sections: FinanceReportSection[]
  totalLabel: string
  total: string
}>()
</script>

<template>
  <table class="w-full text-sm">
    <tbody>
      <template v-for="section in sections" :key="section.report_section">
        <tr class="bg-gray-50 dark:bg-gray-800/60">
          <td class="px-4 py-2 font-semibold text-gray-900 dark:text-gray-100" colspan="2">
            {{ section.label }}
          </td>
        </tr>
        <tr v-for="account in section.accounts" :key="account.account_id || account.account_name">
          <td class="px-4 py-1.5 pl-8 text-gray-600 dark:text-gray-300">
            <span v-if="account.account_code" class="mr-2 text-gray-400">{{
              account.account_code
            }}</span>
            {{ account.account_name }}
          </td>
          <td class="px-4 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-200">
            {{ formatFinanceAmount(account.amount) }}
          </td>
        </tr>
        <tr class="border-b dark:border-gray-800">
          <td class="px-4 py-1.5 pl-8 font-medium text-gray-800 dark:text-gray-100">
            Subtotal {{ section.label }}
          </td>
          <td
            class="px-4 py-1.5 text-right font-medium tabular-nums text-gray-900 dark:text-gray-100"
          >
            {{ formatFinanceAmount(section.subtotal) }}
          </td>
        </tr>
      </template>
      <tr class="border-t-2 border-gray-300 dark:border-gray-700">
        <td class="px-4 py-2 font-bold text-gray-900 dark:text-gray-100">{{ totalLabel }}</td>
        <td class="px-4 py-2 text-right font-bold tabular-nums text-gray-900 dark:text-gray-100">
          {{ formatFinanceAmount(total) }}
        </td>
      </tr>
    </tbody>
  </table>
</template>
