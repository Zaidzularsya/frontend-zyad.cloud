<script setup lang="ts">
import { reactive, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import AccountPickerSelect from '@/features/finance/components/AccountPickerSelect.vue'
import { useCreateFinanceAssetCategoryMutation } from '@/features/finance/api/fixed-assets.queries'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created'): void
}>()

const createMutation = useCreateFinanceAssetCategoryMutation()
const errorMessage = ref('')

const form = reactive({
  code: '',
  name: '',
  asset_account_id: '',
  accumulated_depreciation_account_id: '',
  depreciation_expense_account_id: '',
  default_useful_life_months: '',
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.code = ''
    form.name = ''
    form.asset_account_id = ''
    form.accumulated_depreciation_account_id = ''
    form.depreciation_expense_account_id = ''
    form.default_useful_life_months = ''
    errorMessage.value = ''
  },
)

async function submit() {
  errorMessage.value = ''
  if (
    !form.code ||
    !form.name ||
    !form.asset_account_id ||
    !form.accumulated_depreciation_account_id ||
    !form.depreciation_expense_account_id
  ) {
    errorMessage.value = 'Kode, nama, dan ketiga akun GL wajib diisi.'
    return
  }
  try {
    await createMutation.mutateAsync({
      code: form.code,
      name: form.name,
      asset_account_id: form.asset_account_id,
      accumulated_depreciation_account_id: form.accumulated_depreciation_account_id,
      depreciation_expense_account_id: form.depreciation_expense_account_id,
      default_useful_life_months: form.default_useful_life_months
        ? Number(form.default_useful_life_months)
        : undefined,
    })
    emit('created')
    emit('close')
  } catch (error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    errorMessage.value = response?.data?.message ?? 'Gagal menyimpan kategori aset.'
  }
}
</script>

<template>
  <BaseModal :open="open" title="Kategori Aset Baru" @close="$emit('close')">
    <form class="space-y-3" @submit.prevent="submit">
      <div class="grid grid-cols-2 gap-3">
        <label class="text-sm font-medium">
          Kode
          <input
            v-model="form.code"
            type="text"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
        <label class="text-sm font-medium">
          Nama
          <input
            v-model="form.name"
            type="text"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
      </div>

      <label class="block text-sm font-medium">
        Akun Aset Tetap
        <AccountPickerSelect v-model="form.asset_account_id" />
      </label>
      <label class="block text-sm font-medium">
        Akun Akumulasi Penyusutan
        <AccountPickerSelect v-model="form.accumulated_depreciation_account_id" />
      </label>
      <label class="block text-sm font-medium">
        Akun Beban Penyusutan
        <AccountPickerSelect v-model="form.depreciation_expense_account_id" />
      </label>

      <label class="block text-sm font-medium">
        Umur Ekonomis Default (bulan, opsional)
        <input
          v-model="form.default_useful_life_months"
          type="number"
          min="1"
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
