<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useToast } from '@/components/ui/toast'
import type { Invoice } from '@/features/receivable/api/receivable.api'
import { useVoidInvoiceMutation } from '@/features/receivable/api/receivable.queries'
import { receivableErrorMessage } from '@/features/receivable/utils/errors'

const props = defineProps<{ open: boolean; invoice: Invoice }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'voided'): void }>()

const toast = useToast()
const mutation = useVoidInvoiceMutation()
const reason = ref('')
const errorMessage = ref('')

watch(
  () => props.open,
  (open) => {
    if (open) {
      reason.value = ''
      errorMessage.value = ''
    }
  },
)

const canSubmit = computed(
  () => reason.value.trim().length > 0 && reason.value.length <= 500 && !mutation.isPending.value,
)

async function submit() {
  if (!canSubmit.value) return
  errorMessage.value = ''
  try {
    await mutation.mutateAsync({ id: props.invoice.id, reason: reason.value.trim() })
    toast.success('Invoice dibatalkan.')
    emit('voided')
    emit('close')
  } catch (error) {
    errorMessage.value = receivableErrorMessage(error, 'Invoice gagal dibatalkan. Coba lagi.')
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="`Batalkan ${invoice.invoice_number ?? 'draft invoice'}`"
    @close="emit('close')"
  >
    <form class="space-y-4 text-sm" @submit.prevent="submit">
      <p class="text-gray-600 dark:text-gray-300">
        Invoice yang dibatalkan tidak bisa dibuka kembali, dan link publiknya menampilkan status
        “Dibatalkan”.
      </p>
      <label class="block space-y-1">
        <span class="font-medium">Alasan pembatalan</span>
        <textarea
          v-model="reason"
          name="reason"
          rows="3"
          maxlength="500"
          class="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
        />
      </label>
      <p v-if="errorMessage" class="text-red-600" role="alert">{{ errorMessage }}</p>
      <div class="flex justify-end gap-2 pt-2">
        <BaseButton variant="secondary" @click="emit('close')">Kembali</BaseButton>
        <BaseButton type="submit" variant="danger" :disabled="!canSubmit">
          {{ mutation.isPending.value ? 'Membatalkan...' : 'Batalkan invoice' }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
