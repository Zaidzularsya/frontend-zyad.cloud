<script setup lang="ts">
import { reactive, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import {
  useCreateFinanceTaxRateMutation,
  useFinanceTaxTypesQuery,
} from '@/features/finance/api/tax.queries'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created'): void
}>()

const typesQuery = useFinanceTaxTypesQuery()
const createMutation = useCreateFinanceTaxRateMutation()
const errorMessage = ref('')

const form = reactive({
  tax_type_id: '',
  rate_percent: '',
  effective_date: new Date().toISOString().slice(0, 10),
  end_date: '',
  notes: '',
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    errorMessage.value = ''
    form.tax_type_id = ''
    form.rate_percent = ''
    form.effective_date = new Date().toISOString().slice(0, 10)
    form.end_date = ''
    form.notes = ''
  },
)

async function submit() {
  errorMessage.value = ''
  if (!form.tax_type_id || !form.rate_percent) {
    errorMessage.value = 'Jenis pajak dan tarif wajib diisi.'
    return
  }
  try {
    await createMutation.mutateAsync({
      tax_type_id: form.tax_type_id,
      rate_percent: String(form.rate_percent),
      effective_date: form.effective_date,
      end_date: form.end_date || undefined,
      notes: form.notes || undefined,
    })
    emit('created')
    emit('close')
  } catch (error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    errorMessage.value = response?.data?.message ?? 'Gagal menyimpan tarif pajak.'
  }
}
</script>

<template>
  <BaseModal :open="open" title="Tarif Pajak Baru" @close="$emit('close')">
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

      <div class="grid grid-cols-2 gap-3">
        <label class="text-sm font-medium">
          Tarif (%)
          <input
            v-model="form.rate_percent"
            type="number"
            min="0"
            step="0.01"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
        <label class="text-sm font-medium">
          Berlaku Mulai
          <input
            v-model="form.effective_date"
            type="date"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
      </div>

      <label class="block text-sm font-medium">
        Berlaku Sampai (opsional, kosongkan jika masih berlaku)
        <input
          v-model="form.end_date"
          type="date"
          class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        />
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
