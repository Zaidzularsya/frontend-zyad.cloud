<script setup lang="ts">
import { reactive, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useCreateFinanceARAPPaymentMutation } from '@/features/finance/api/ar-ap.queries'
import { useFinanceCashBankAccountsQuery } from '@/features/finance/api/cash-bank.queries'
import { formatFinanceAmount } from '@/features/finance/utils/format'
import type { FinanceARAPTransaction } from '@/features/finance/api/ar-ap.api'

const props = defineProps<{ open: boolean; transaction: FinanceARAPTransaction | null }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created'): void
}>()

const includeInactive = ref(false)
const cashBankAccountsQuery = useFinanceCashBankAccountsQuery(includeInactive)
const createMutation = useCreateFinanceARAPPaymentMutation()
const errorMessage = ref('')

const form = reactive({
  payment_date: new Date().toISOString().slice(0, 10),
  amount: '',
  cash_bank_account_id: '',
  notes: '',
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    errorMessage.value = ''
    form.payment_date = new Date().toISOString().slice(0, 10)
    form.amount = props.transaction?.outstanding_amount ?? ''
    form.cash_bank_account_id = ''
    form.notes = ''
  },
)

async function submit() {
  errorMessage.value = ''
  if (!props.transaction) return
  if (!form.amount || !form.cash_bank_account_id) {
    errorMessage.value = 'Nominal dan akun kas/bank wajib diisi.'
    return
  }
  try {
    await createMutation.mutateAsync({
      partner_id: props.transaction.partner_id,
      ar_ap_transaction_id: props.transaction.id,
      payment_date: form.payment_date,
      amount: String(form.amount),
      cash_bank_account_id: form.cash_bank_account_id,
      notes: form.notes || undefined,
    })
    emit('created')
    emit('close')
  } catch (error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    errorMessage.value = response?.data?.message ?? 'Gagal mencatat pembayaran.'
  }
}
</script>

<template>
  <BaseModal :open="open" title="Catat Pembayaran" @close="$emit('close')">
    <form v-if="transaction" class="space-y-3" @submit.prevent="submit">
      <p class="text-sm text-gray-500">
        {{ transaction.partner_name }} — sisa outstanding
        <span class="font-medium text-gray-900 dark:text-gray-100">{{
          formatFinanceAmount(transaction.outstanding_amount)
        }}</span>
      </p>

      <div class="grid grid-cols-2 gap-3">
        <label class="text-sm font-medium">
          Tanggal Bayar
          <input
            v-model="form.payment_date"
            type="date"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
        <label class="text-sm font-medium">
          Nominal
          <input
            v-model="form.amount"
            type="number"
            min="0"
            step="0.01"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
      </div>

      <label class="block text-sm font-medium">
        Akun Kas/Bank
        <select
          v-model="form.cash_bank_account_id"
          class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        >
          <option value="">Pilih akun...</option>
          <option v-for="a in cashBankAccountsQuery.data.value ?? []" :key="a.id" :value="a.id">
            {{ a.account_code }} — {{ a.account_name }}
          </option>
        </select>
      </label>

      <label class="block text-sm font-medium">
        Catatan
        <input
          v-model="form.notes"
          type="text"
          class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        />
      </label>

      <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

      <div class="flex justify-end gap-2 pt-2">
        <BaseButton type="button" variant="secondary" @click="$emit('close')">Batal</BaseButton>
        <BaseButton type="submit" :disabled="createMutation.isPending.value">Simpan</BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
