<script setup lang="ts">
import { reactive, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import AccountPickerSelect from '@/features/finance/components/AccountPickerSelect.vue'
import {
  useCreateFinanceTaxTransactionMutation,
  useFinanceTaxTypesQuery,
} from '@/features/finance/api/tax.queries'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created'): void
}>()

const typesQuery = useFinanceTaxTypesQuery()
const createMutation = useCreateFinanceTaxTransactionMutation()
const errorMessage = ref('')

const form = reactive({
  tax_type_id: '',
  transaction_date: new Date().toISOString().slice(0, 10),
  reference_number: '',
  amount: '',
  direction: 'increase' as 'increase' | 'decrease',
  tax_account_id: '',
  contra_account_id: '',
  description: '',
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    errorMessage.value = ''
    form.tax_type_id = ''
    form.transaction_date = new Date().toISOString().slice(0, 10)
    form.reference_number = ''
    form.amount = ''
    form.direction = 'increase'
    form.tax_account_id = ''
    form.contra_account_id = ''
    form.description = ''
  },
)

async function submit() {
  errorMessage.value = ''
  if (!form.tax_type_id || !form.amount || !form.tax_account_id || !form.contra_account_id) {
    errorMessage.value = 'Jenis pajak, nominal, akun pajak, dan akun lawan wajib diisi.'
    return
  }
  try {
    await createMutation.mutateAsync({
      tax_type_id: form.tax_type_id,
      transaction_date: form.transaction_date,
      reference_number: form.reference_number || undefined,
      amount: String(form.amount),
      direction: form.direction,
      tax_account_id: form.tax_account_id,
      contra_account_id: form.contra_account_id,
      description: form.description || undefined,
    })
    emit('created')
    emit('close')
  } catch (error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    errorMessage.value = response?.data?.message ?? 'Gagal mencatat transaksi pajak.'
  }
}
</script>

<template>
  <BaseModal :open="open" title="Transaksi Pajak Baru" @close="$emit('close')">
    <form class="space-y-3" @submit.prevent="submit">
      <label class="block text-sm font-medium">
        Jenis Pajak
        <select
          v-model="form.tax_type_id"
          class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        >
          <option value="">Pilih jenis pajak...</option>
          <option v-for="t in typesQuery.data.value ?? []" :key="t.id" :value="t.id">
            {{ t.code }} — {{ t.name }}
          </option>
        </select>
      </label>

      <label class="block text-sm font-medium">
        Arah
        <select
          v-model="form.direction"
          class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        >
          <option value="increase">Bertambah (mis. dipungut/dipotong)</option>
          <option value="decrease">Berkurang (mis. disetor/dikreditkan)</option>
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

      <label class="block text-sm font-medium">
        Akun Pajak (Liabilitas/Aset)
        <AccountPickerSelect v-model="form.tax_account_id" />
      </label>
      <label class="block text-sm font-medium">
        Akun Lawan
        <AccountPickerSelect v-model="form.contra_account_id" />
      </label>

      <label class="block text-sm font-medium">
        No. Referensi (mis. no. bukti potong)
        <input
          v-model="form.reference_number"
          type="text"
          class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        />
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
