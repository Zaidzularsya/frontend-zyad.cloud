<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import AccountPickerSelect from '@/features/finance/components/AccountPickerSelect.vue'
import { useCreateFinanceARAPTransactionMutation } from '@/features/finance/api/ar-ap.queries'
import { useFinanceBusinessPartnersQuery } from '@/features/finance/api/business-partners.queries'
import type { FinanceARAPTransactionType } from '@/features/finance/api/ar-ap.api'

const props = defineProps<{ open: boolean; transactionType: FinanceARAPTransactionType }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created'): void
}>()

const partnerFilter = computed(() => ({
  partner_type:
    props.transactionType === 'receivable' ? ('customer' as const) : ('vendor' as const),
}))
const partnersQuery = useFinanceBusinessPartnersQuery(partnerFilter)
const createMutation = useCreateFinanceARAPTransactionMutation()
const errorMessage = ref('')

const form = reactive({
  partner_id: '',
  transaction_date: new Date().toISOString().slice(0, 10),
  due_date: new Date().toISOString().slice(0, 10),
  reference_number: '',
  amount: '',
  contra_account_id: '',
  description: '',
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    errorMessage.value = ''
    form.partner_id = ''
    form.transaction_date = new Date().toISOString().slice(0, 10)
    form.due_date = new Date().toISOString().slice(0, 10)
    form.reference_number = ''
    form.amount = ''
    form.contra_account_id = ''
    form.description = ''
  },
)

const title = computed(() =>
  props.transactionType === 'receivable' ? 'Invoice Piutang Baru' : 'Tagihan Utang Baru',
)
const contraLabel = computed(() =>
  props.transactionType === 'receivable' ? 'Akun Pendapatan' : 'Akun Beban',
)

async function submit() {
  errorMessage.value = ''
  if (!form.partner_id || !form.amount || !form.contra_account_id) {
    errorMessage.value = 'Mitra, nominal, dan akun lawan wajib diisi.'
    return
  }
  try {
    await createMutation.mutateAsync({
      partner_id: form.partner_id,
      transaction_type: props.transactionType,
      transaction_date: form.transaction_date,
      due_date: form.due_date,
      reference_number: form.reference_number || undefined,
      amount: String(form.amount),
      contra_account_id: form.contra_account_id,
      description: form.description || undefined,
    })
    emit('created')
    emit('close')
  } catch (error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    errorMessage.value = response?.data?.message ?? 'Gagal mencatat transaksi.'
  }
}
</script>

<template>
  <BaseModal :open="open" :title="title" @close="$emit('close')">
    <form class="space-y-3" @submit.prevent="submit">
      <label class="block text-sm font-medium">
        Mitra Bisnis
        <select
          v-model="form.partner_id"
          class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        >
          <option value="">Pilih mitra...</option>
          <option v-for="p in partnersQuery.data.value ?? []" :key="p.id" :value="p.id">
            {{ p.code }} — {{ p.name }}
          </option>
        </select>
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="text-sm font-medium">
          Tanggal Transaksi
          <input
            v-model="form.transaction_date"
            type="date"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
        <label class="text-sm font-medium">
          Jatuh Tempo
          <input
            v-model="form.due_date"
            type="date"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
      </div>

      <div class="grid grid-cols-2 gap-3">
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
        <label class="text-sm font-medium">
          No. Referensi
          <input
            v-model="form.reference_number"
            type="text"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
      </div>

      <label class="block text-sm font-medium">
        {{ contraLabel }}
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
