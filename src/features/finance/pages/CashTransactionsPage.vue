<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Plus } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import PermissionGate from '@/components/common/PermissionGate.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import CashTransactionFormModal from '@/features/finance/components/CashTransactionFormModal.vue'
import {
  useFinanceCashBankAccountsQuery,
  useFinanceCashTransactionsQuery,
} from '@/features/finance/api/cash-bank.queries'
import { formatFinanceAmount } from '@/features/finance/utils/format'

const includeInactive = ref(false)
const cashBankAccountsQuery = useFinanceCashBankAccountsQuery(includeInactive)

const filters = reactive({ cash_bank_account_id: '', start_date: '', end_date: '' })
const listParams = computed(() => ({
  cash_bank_account_id: filters.cash_bank_account_id || undefined,
  start_date: filters.start_date || undefined,
  end_date: filters.end_date || undefined,
}))
const transactionsQuery = useFinanceCashTransactionsQuery(listParams)

const modalOpen = ref(false)

const typeLabels: Record<string, string> = {
  cash_in: 'Masuk',
  cash_out: 'Keluar',
  transfer: 'Transfer',
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Transaksi Kas & Bank"
      description="Riwayat mutasi kas masuk, kas keluar, dan transfer antar akun."
    >
      <PermissionGate permission="platform.finance.cashbank.manage">
        <BaseButton @click="modalOpen = true"> <Plus class="size-4" /> Transaksi Baru </BaseButton>
      </PermissionGate>
    </PageHeader>

    <BaseCard>
      <div class="mb-3 flex flex-wrap items-end gap-3">
        <label class="text-sm font-medium">
          Akun
          <select
            v-model="filters.cash_bank_account_id"
            class="mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          >
            <option value="">Semua akun</option>
            <option v-for="a in cashBankAccountsQuery.data.value ?? []" :key="a.id" :value="a.id">
              {{ a.account_code }} — {{ a.account_name }}
            </option>
          </select>
        </label>
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
            <th class="px-3 py-2">Tanggal</th>
            <th class="px-3 py-2">Akun</th>
            <th class="px-3 py-2">Jenis</th>
            <th class="px-3 py-2">Keterangan</th>
            <th class="px-3 py-2 text-right">Nominal</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="t in transactionsQuery.data.value?.data ?? []"
            :key="t.id"
            class="border-b last:border-0 dark:border-gray-800"
          >
            <td class="px-3 py-2">{{ t.transaction_date }}</td>
            <td class="px-3 py-2">{{ t.cash_bank_account_label }}</td>
            <td class="px-3 py-2">{{ typeLabels[t.transaction_type] }}</td>
            <td class="px-3 py-2 text-gray-500">{{ t.description }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ formatFinanceAmount(t.amount) }}</td>
          </tr>
        </tbody>
      </table>
    </BaseCard>

    <CashTransactionFormModal
      :open="modalOpen"
      @close="modalOpen = false"
      @created="transactionsQuery.refetch()"
    />
  </div>
</template>
