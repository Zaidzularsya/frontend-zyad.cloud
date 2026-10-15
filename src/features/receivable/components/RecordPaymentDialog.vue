<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useToast } from '@/components/ui/toast'
import { normalizeAmount } from '@/features/crm/leads/utils/convert-form'
import { formatRupiah } from '@/features/crm/quotations/utils/quotation-editor'
import type { Invoice } from '@/features/receivable/api/receivable.api'
import { useRecordPaymentMutation } from '@/features/receivable/api/receivable.queries'
import { receivableErrorMessage } from '@/features/receivable/utils/errors'
import { validatePayment } from '@/features/receivable/utils/invoice-form'

const props = defineProps<{ open: boolean; invoice: Invoice }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'recorded'): void }>()

const toast = useToast()
const mutation = useRecordPaymentMutation()

const amount = ref('')
const paidAt = ref('')
const reference = ref('')
const note = ref('')
const errorMessage = ref('')
const touched = ref(false)

function today() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    amount.value = props.invoice.balance
    paidAt.value = today()
    reference.value = ''
    note.value = ''
    errorMessage.value = ''
    touched.value = false
  },
  { immediate: true },
)

const validation = computed(() => validatePayment(amount.value, props.invoice.balance))
const canSubmit = computed(() => validation.value === null && !mutation.isPending.value)

async function submit() {
  touched.value = true
  if (!canSubmit.value) return
  errorMessage.value = ''
  try {
    await mutation.mutateAsync({
      id: props.invoice.id,
      payload: {
        amount: normalizeAmount(amount.value.trim()) ?? amount.value.trim(),
        paid_at: paidAt.value || undefined,
        reference: reference.value.trim() || undefined,
        note: note.value.trim() || undefined,
      },
    })
    toast.success('Pembayaran dicatat.')
    emit('recorded')
    emit('close')
  } catch (error) {
    errorMessage.value = receivableErrorMessage(error, 'Pembayaran gagal dicatat. Coba lagi.')
  }
}

const inputClass =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950'
</script>

<template>
  <BaseModal
    :open="open"
    :title="`Catat pembayaran ${invoice.invoice_number ?? ''}`"
    @close="emit('close')"
  >
    <form class="space-y-4 text-sm" @submit.prevent="submit">
      <p class="text-gray-600 dark:text-gray-300">
        Sisa tagihan <strong>{{ formatRupiah(invoice.balance) }}</strong> dari
        {{ formatRupiah(invoice.grand_total) }}.
      </p>
      <label class="block space-y-1">
        <span class="font-medium">Jumlah (Rp)</span>
        <input v-model="amount" name="amount" inputmode="decimal" :class="inputClass" />
        <span v-if="touched && validation" class="block text-xs text-red-600" role="alert">{{
          validation
        }}</span>
      </label>
      <label class="block space-y-1">
        <span class="font-medium">Tanggal bayar</span>
        <input v-model="paidAt" type="date" name="paid_at" :max="today()" :class="inputClass" />
      </label>
      <label class="block space-y-1">
        <span class="font-medium">Referensi (opsional)</span>
        <input
          v-model="reference"
          name="reference"
          maxlength="150"
          :class="inputClass"
          placeholder="mis. nomor transfer"
        />
      </label>
      <label class="block space-y-1">
        <span class="font-medium">Catatan (opsional)</span>
        <textarea v-model="note" name="note" rows="2" maxlength="500" :class="inputClass" />
      </label>
      <p v-if="errorMessage" class="text-red-600" role="alert">{{ errorMessage }}</p>
      <div class="flex justify-end gap-2 pt-2">
        <BaseButton variant="secondary" @click="emit('close')">Batal</BaseButton>
        <BaseButton type="submit" :disabled="mutation.isPending.value">
          {{ mutation.isPending.value ? 'Menyimpan...' : 'Catat pembayaran' }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
