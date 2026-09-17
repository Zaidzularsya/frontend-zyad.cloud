<script setup lang="ts">
import { reactive, ref } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import AccountPickerSelect from '@/features/finance/components/AccountPickerSelect.vue'
import { useCreateFinanceCashBankAccountMutation } from '@/features/finance/api/cash-bank.queries'
import type { FinanceCashBankType } from '@/features/finance/api/cash-bank.api'

defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const createMutation = useCreateFinanceCashBankAccountMutation()
const errorMessage = ref('')

const form = reactive({
  account_id: '',
  type: 'bank' as FinanceCashBankType,
  bank_name: '',
  account_number: '',
  account_holder_name: '',
})

function resetForm() {
  form.account_id = ''
  form.type = 'bank'
  form.bank_name = ''
  form.account_number = ''
  form.account_holder_name = ''
  errorMessage.value = ''
}

async function submit() {
  errorMessage.value = ''
  if (!form.account_id) {
    errorMessage.value = 'Pilih akun GL kas/bank terlebih dahulu.'
    return
  }
  try {
    await createMutation.mutateAsync({
      account_id: form.account_id,
      type: form.type,
      bank_name: form.type === 'bank' ? form.bank_name : undefined,
      account_number: form.type === 'bank' ? form.account_number : undefined,
      account_holder_name: form.type === 'bank' ? form.account_holder_name : undefined,
    })
    resetForm()
    emit('saved')
    emit('close')
  } catch (error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    errorMessage.value = response?.data?.message ?? 'Gagal menyimpan akun kas/bank.'
  }
}
</script>

<template>
  <BaseModal :open="open" title="Akun Kas/Bank Baru" @close="$emit('close')">
    <form class="space-y-3" @submit.prevent="submit">
      <label class="block text-sm font-medium">
        Akun GL (Kas/Bank)
        <AccountPickerSelect v-model="form.account_id" placeholder="Pilih akun kas atau bank..." />
      </label>

      <label class="block text-sm font-medium">
        Jenis
        <select
          v-model="form.type"
          class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        >
          <option value="cash">Kas</option>
          <option value="bank">Bank</option>
        </select>
      </label>

      <template v-if="form.type === 'bank'">
        <label class="block text-sm font-medium">
          Nama Bank
          <input
            v-model="form.bank_name"
            type="text"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
        <label class="block text-sm font-medium">
          Nomor Rekening
          <input
            v-model="form.account_number"
            type="text"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
        <label class="block text-sm font-medium">
          Nama Pemegang Rekening
          <input
            v-model="form.account_holder_name"
            type="text"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
      </template>

      <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

      <div class="flex justify-end gap-2 pt-2">
        <BaseButton type="button" variant="secondary" @click="$emit('close')">Batal</BaseButton>
        <BaseButton type="submit" :disabled="createMutation.isPending.value">Simpan</BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
