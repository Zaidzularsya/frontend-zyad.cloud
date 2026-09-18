<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import {
  useFinanceAccountCategoriesQuery,
  useCreateFinanceAccountMutation,
  useUpdateFinanceAccountMutation,
} from '@/features/finance/api/coa.queries'
import type { FinanceAccount, FinanceNormalBalance } from '@/features/finance/api/coa.api'

const props = defineProps<{
  open: boolean
  account: FinanceAccount | null
}>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const categoriesQuery = useFinanceAccountCategoriesQuery()
const createMutation = useCreateFinanceAccountMutation()
const updateMutation = useUpdateFinanceAccountMutation()
const isEdit = computed(() => Boolean(props.account))
const errorMessage = reactive({ value: '' })

const form = reactive({
  account_code: '',
  account_name: '',
  account_category_id: '',
  is_header: false,
  normal_balance: 'debit' as FinanceNormalBalance,
  opening_balance: '0',
  opening_balance_date: '',
  description: '',
  is_active: true,
})

watch(
  () => props.account,
  (account) => {
    errorMessage.value = ''
    if (account) {
      form.account_code = account.account_code
      form.account_name = account.account_name
      form.account_category_id = account.account_category_id ?? ''
      form.is_header = account.is_header
      form.normal_balance = account.normal_balance
      form.opening_balance = account.opening_balance
      form.opening_balance_date = account.opening_balance_date ?? ''
      form.description = account.description ?? ''
      form.is_active = account.is_active
    } else {
      form.account_code = ''
      form.account_name = ''
      form.account_category_id = ''
      form.is_header = false
      form.normal_balance = 'debit'
      form.opening_balance = '0'
      form.opening_balance_date = ''
      form.description = ''
      form.is_active = true
    }
  },
  { immediate: true },
)

async function submit() {
  errorMessage.value = ''
  try {
    if (isEdit.value && props.account) {
      await updateMutation.mutateAsync({
        id: props.account.id,
        payload: {
          account_name: form.account_name,
          account_category_id: form.account_category_id || undefined,
          is_active: form.is_active,
          opening_balance: String(form.opening_balance),
          opening_balance_date: form.opening_balance_date || null,
          description: form.description,
        },
      })
    } else {
      await createMutation.mutateAsync({
        account_code: form.account_code,
        account_name: form.account_name,
        account_category_id: form.account_category_id || undefined,
        is_header: form.is_header,
        normal_balance: form.normal_balance,
        opening_balance: String(form.opening_balance),
        opening_balance_date: form.opening_balance_date || null,
        description: form.description,
      })
    }
    emit('saved')
    emit('close')
  } catch (error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    errorMessage.value = response?.data?.message ?? 'Gagal menyimpan akun.'
  }
}
</script>

<template>
  <BaseModal :open="open" :title="isEdit ? 'Edit Akun' : 'Akun Baru'" @close="$emit('close')">
    <form class="space-y-3" @submit.prevent="submit">
      <div class="grid grid-cols-2 gap-3">
        <label class="text-sm font-medium">
          Kode Akun
          <input
            v-model="form.account_code"
            type="text"
            required
            :disabled="isEdit"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:disabled:bg-gray-900"
          />
        </label>
        <label class="text-sm font-medium">
          Saldo Normal
          <select
            v-model="form.normal_balance"
            :disabled="isEdit"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:disabled:bg-gray-900"
          >
            <option value="debit">Debit</option>
            <option value="credit">Kredit</option>
          </select>
        </label>
      </div>

      <label class="block text-sm font-medium">
        Nama Akun
        <input
          v-model="form.account_name"
          type="text"
          required
          class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        />
      </label>

      <label class="block text-sm font-medium">
        Kategori
        <select
          v-model="form.account_category_id"
          class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        >
          <option value="">-- Pilih kategori --</option>
          <option
            v-for="category in categoriesQuery.data.value ?? []"
            :key="category.id"
            :value="category.id"
          >
            {{ category.name }}
          </option>
        </select>
      </label>

      <label v-if="!isEdit" class="flex items-center gap-2 text-sm font-medium">
        <input v-model="form.is_header" type="checkbox" />
        Akun header (tidak bisa dipakai untuk jurnal)
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="text-sm font-medium">
          Saldo Awal
          <input
            v-model="form.opening_balance"
            type="number"
            step="0.01"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
        <label class="text-sm font-medium">
          Tanggal Saldo Awal
          <input
            v-model="form.opening_balance_date"
            type="date"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
      </div>

      <label v-if="isEdit" class="flex items-center gap-2 text-sm font-medium">
        <input v-model="form.is_active" type="checkbox" />
        Aktif
      </label>

      <p v-if="errorMessage.value" class="text-sm text-red-600">{{ errorMessage.value }}</p>

      <div class="flex justify-end gap-2 pt-2">
        <BaseButton type="button" variant="secondary" @click="$emit('close')">Batal</BaseButton>
        <BaseButton
          type="submit"
          :disabled="createMutation.isPending.value || updateMutation.isPending.value"
        >
          Simpan
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
