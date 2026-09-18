<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import AccountPickerSelect from '@/features/finance/components/AccountPickerSelect.vue'
import {
  useCreateFinanceCashTransactionMutation,
  useFinanceCashBankAccountsQuery,
} from '@/features/finance/api/cash-bank.queries'
import type { FinanceCashTransactionType } from '@/features/finance/api/cash-bank.api'

defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created'): void
}>()

const includeInactive = ref(false)
const cashBankAccountsQuery = useFinanceCashBankAccountsQuery(includeInactive)
const createMutation = useCreateFinanceCashTransactionMutation()
const errorMessage = ref('')

const form = reactive({
  cash_bank_account_id: '',
  transaction_type: 'cash_in' as FinanceCashTransactionType,
  transaction_date: new Date().toISOString().slice(0, 10),
  amount: '',
  contra_account_id: '',
  counter_cash_bank_account_id: '',
  reference: '',
  description: '',
})

const counterOptions = computed(() =>
  (cashBankAccountsQuery.data.value ?? []).filter((a) => a.id !== form.cash_bank_account_id),
)

function resetForm() {
  form.cash_bank_account_id = ''
  form.transaction_type = 'cash_in'
  form.transaction_date = new Date().toISOString().slice(0, 10)
  form.amount = ''
  form.contra_account_id = ''
  form.counter_cash_bank_account_id = ''
  form.reference = ''
  form.description = ''
  errorMessage.value = ''
}

async function submit() {
  errorMessage.value = ''
  if (!form.cash_bank_account_id || !form.amount) {
    errorMessage.value = 'Akun kas/bank dan nominal wajib diisi.'
    return
  }
  try {
    await createMutation.mutateAsync({
      cash_bank_account_id: form.cash_bank_account_id,
      transaction_date: form.transaction_date,
      transaction_type: form.transaction_type,
      amount: String(form.amount),
      contra_account_id: form.transaction_type !== 'transfer' ? form.contra_account_id : undefined,
      counter_cash_bank_account_id:
        form.transaction_type === 'transfer' ? form.counter_cash_bank_account_id : undefined,
      reference: form.reference || undefined,
      description: form.description || undefined,
    })
    resetForm()
    emit('created')
    emit('close')
  } catch (error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    errorMessage.value = response?.data?.message ?? 'Gagal mencatat transaksi kas/bank.'
  }
}
</script>

<template>
  <BaseModal :open="open" title="Transaksi Kas/Bank Baru" @close="$emit('close')">
    <form class="space-y-3" @submit.prevent="submit">
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
        Jenis Transaksi
        <select
          v-model="form.transaction_type"
          class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        >
          <option value="cash_in">Kas/Bank Masuk</option>
          <option value="cash_out">Kas/Bank Keluar</option>
          <option value="transfer">Transfer Antar Akun</option>
        </select>
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="text-sm font-medium">
          Tanggal
          <input
            v-model="form.transaction_date"
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

      <label v-if="form.transaction_type !== 'transfer'" class="block text-sm font-medium">
        Akun Lawan (Pendapatan/Beban/dll)
        <AccountPickerSelect v-model="form.contra_account_id" />
      </label>
      <label v-else class="block text-sm font-medium">
        Ke Akun Kas/Bank
        <select
          v-model="form.counter_cash_bank_account_id"
          class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        >
          <option value="">Pilih akun tujuan...</option>
          <option v-for="a in counterOptions" :key="a.id" :value="a.id">
            {{ a.account_code }} — {{ a.account_name }}
          </option>
        </select>
      </label>

      <label class="block text-sm font-medium">
        Keterangan
        <input
          v-model="form.description"
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
