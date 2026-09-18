<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import PermissionGate from '@/components/common/PermissionGate.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import {
  useCompleteFinanceReconciliationMutation,
  useCreateFinanceReconciliationMutation,
  useFinanceCashBankAccountsQuery,
  useFinanceReconciliationsQuery,
} from '@/features/finance/api/cash-bank.queries'
import { formatFinanceAmount } from '@/features/finance/utils/format'

const includeInactive = ref(false)
const cashBankAccountsQuery = useFinanceCashBankAccountsQuery(includeInactive)

const selectedAccountId = ref('')
const reconciliationsQuery = useFinanceReconciliationsQuery(selectedAccountId)
const createMutation = useCreateFinanceReconciliationMutation()
const completeMutation = useCompleteFinanceReconciliationMutation()

const form = reactive({
  statement_date: new Date().toISOString().slice(0, 10),
  statement_ending_balance: '',
})
const errorMessage = ref('')

const canSubmit = computed(
  () => Boolean(selectedAccountId.value) && Boolean(form.statement_ending_balance),
)

async function submit() {
  errorMessage.value = ''
  try {
    await createMutation.mutateAsync({
      cash_bank_account_id: selectedAccountId.value,
      statement_date: form.statement_date,
      statement_ending_balance: String(form.statement_ending_balance),
    })
    form.statement_ending_balance = ''
  } catch (error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    errorMessage.value = response?.data?.message ?? 'Gagal membuat rekonsiliasi.'
  }
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Rekonsiliasi Bank"
      description="Bandingkan saldo rekening koran dengan saldo buku (GL) per tanggal tertentu."
    />

    <BaseCard>
      <label class="block text-sm font-medium">
        Akun Bank
        <select
          v-model="selectedAccountId"
          class="mt-1 w-full max-w-sm rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        >
          <option value="">Pilih akun bank...</option>
          <option
            v-for="a in (cashBankAccountsQuery.data.value ?? []).filter((x) => x.type === 'bank')"
            :key="a.id"
            :value="a.id"
          >
            {{ a.account_code }} — {{ a.account_name }}
          </option>
        </select>
      </label>
    </BaseCard>

    <BaseCard v-if="selectedAccountId">
      <PermissionGate permission="platform.finance.cashbank.manage">
        <form class="flex flex-wrap items-end gap-3" @submit.prevent="submit">
          <label class="text-sm font-medium">
            Tanggal Statement
            <input
              v-model="form.statement_date"
              type="date"
              class="mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
            />
          </label>
          <label class="text-sm font-medium">
            Saldo Akhir Rekening Koran
            <input
              v-model="form.statement_ending_balance"
              type="number"
              step="0.01"
              class="mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
            />
          </label>
          <BaseButton type="submit" :disabled="!canSubmit || createMutation.isPending.value">
            Bandingkan
          </BaseButton>
        </form>
        <p v-if="errorMessage" class="mt-2 text-sm text-red-600">{{ errorMessage }}</p>
      </PermissionGate>

      <table class="mt-4 w-full text-sm">
        <thead>
          <tr
            class="border-b text-left text-xs font-medium uppercase text-gray-500 dark:border-gray-800"
          >
            <th class="px-3 py-2">Tanggal</th>
            <th class="px-3 py-2 text-right">Saldo Statement</th>
            <th class="px-3 py-2 text-right">Saldo Buku</th>
            <th class="px-3 py-2 text-right">Selisih</th>
            <th class="px-3 py-2">Status</th>
            <th class="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="rec in reconciliationsQuery.data.value ?? []"
            :key="rec.id"
            class="border-b last:border-0 dark:border-gray-800"
          >
            <td class="px-3 py-2">{{ rec.statement_date }}</td>
            <td class="px-3 py-2 text-right tabular-nums">
              {{ formatFinanceAmount(rec.statement_ending_balance) }}
            </td>
            <td class="px-3 py-2 text-right tabular-nums">
              {{ formatFinanceAmount(rec.book_ending_balance) }}
            </td>
            <td
              class="px-3 py-2 text-right tabular-nums font-medium"
              :class="Number(rec.difference) === 0 ? 'text-emerald-600' : 'text-amber-600'"
            >
              {{ formatFinanceAmount(rec.difference) }}
            </td>
            <td class="px-3 py-2">
              {{ rec.status === 'completed' ? 'Selesai' : 'Draft' }}
            </td>
            <td class="px-3 py-2 text-right">
              <PermissionGate permission="platform.finance.cashbank.manage">
                <BaseButton
                  v-if="rec.status === 'draft'"
                  variant="outline"
                  @click="completeMutation.mutate(rec.id)"
                >
                  Tandai Selesai
                </BaseButton>
              </PermissionGate>
            </td>
          </tr>
        </tbody>
      </table>
    </BaseCard>
  </div>
</template>
