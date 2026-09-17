<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import AccountPickerSelect from '@/features/finance/components/AccountPickerSelect.vue'
import {
  useCreateFinanceFixedAssetMutation,
  useFinanceAssetCategoriesQuery,
} from '@/features/finance/api/fixed-assets.queries'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created'): void
}>()

const includeInactive = ref(false)
const categoriesQuery = useFinanceAssetCategoriesQuery(
  computed(() => ({ include_inactive: includeInactive.value })),
)
const createMutation = useCreateFinanceFixedAssetMutation()
const errorMessage = ref('')

const form = reactive({
  asset_category_id: '',
  asset_code: '',
  asset_name: '',
  acquisition_date: new Date().toISOString().slice(0, 10),
  acquisition_cost: '',
  salvage_value: '',
  useful_life_months: '',
  description: '',
  contra_account_id: '',
})

const selectedCategory = computed(() =>
  (categoriesQuery.data.value ?? []).find((c) => c.id === form.asset_category_id),
)

watch(
  () => form.asset_category_id,
  () => {
    if (selectedCategory.value?.default_useful_life_months && !form.useful_life_months) {
      form.useful_life_months = String(selectedCategory.value.default_useful_life_months)
    }
  },
)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    errorMessage.value = ''
    form.asset_category_id = ''
    form.asset_code = ''
    form.asset_name = ''
    form.acquisition_date = new Date().toISOString().slice(0, 10)
    form.acquisition_cost = ''
    form.salvage_value = ''
    form.useful_life_months = ''
    form.description = ''
    form.contra_account_id = ''
  },
)

async function submit() {
  errorMessage.value = ''
  if (
    !form.asset_category_id ||
    !form.asset_code ||
    !form.asset_name ||
    !form.acquisition_cost ||
    !form.useful_life_months ||
    !form.contra_account_id
  ) {
    errorMessage.value = 'Kategori, kode, nama, nominal, umur ekonomis, dan akun dana wajib diisi.'
    return
  }
  try {
    await createMutation.mutateAsync({
      asset_category_id: form.asset_category_id,
      asset_code: form.asset_code,
      asset_name: form.asset_name,
      acquisition_date: form.acquisition_date,
      acquisition_cost: form.acquisition_cost,
      salvage_value: form.salvage_value || undefined,
      useful_life_months: Number(form.useful_life_months),
      description: form.description || undefined,
      contra_account_id: form.contra_account_id,
    })
    emit('created')
    emit('close')
  } catch (error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    errorMessage.value = response?.data?.message ?? 'Gagal mencatat aset tetap.'
  }
}
</script>

<template>
  <BaseModal :open="open" title="Aset Tetap Baru" @close="$emit('close')">
    <form class="space-y-3" @submit.prevent="submit">
      <label class="block text-sm font-medium">
        Kategori Aset
        <select
          v-model="form.asset_category_id"
          class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        >
          <option value="">Pilih kategori...</option>
          <option v-for="cat in categoriesQuery.data.value ?? []" :key="cat.id" :value="cat.id">
            {{ cat.code }} — {{ cat.name }}
          </option>
        </select>
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="text-sm font-medium">
          Kode Aset
          <input
            v-model="form.asset_code"
            type="text"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
        <label class="text-sm font-medium">
          Nama Aset
          <input
            v-model="form.asset_name"
            type="text"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <label class="text-sm font-medium">
          Tanggal Perolehan
          <input
            v-model="form.acquisition_date"
            type="date"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
        <label class="text-sm font-medium">
          Harga Perolehan
          <input
            v-model="form.acquisition_cost"
            type="number"
            min="0"
            step="0.01"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <label class="text-sm font-medium">
          Nilai Residu (opsional)
          <input
            v-model="form.salvage_value"
            type="number"
            min="0"
            step="0.01"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
        <label class="text-sm font-medium">
          Umur Ekonomis (bulan)
          <input
            v-model="form.useful_life_months"
            type="number"
            min="1"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
      </div>

      <label class="block text-sm font-medium">
        Sumber Dana (Kas/Bank atau Utang)
        <AccountPickerSelect v-model="form.contra_account_id" />
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
