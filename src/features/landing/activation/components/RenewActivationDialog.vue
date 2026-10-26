<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

import { useRenewActivationMutation } from '../api/activation.queries'
import {
  buildRenewPayload,
  renewErrorMessage,
  validateRenewForm,
  type ActivationInvoiceRow,
} from '../utils/activation-invoices'
import { dueUnitLabel, type ActivationResult, type DueUnit } from '../utils/activation-state'
import ActivationLinksPanel from './ActivationLinksPanel.vue'

const props = defineProps<{ open: boolean; row: ActivationInvoiceRow | null }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'renewed'): void }>()

const mutation = useRenewActivationMutation()

const form = reactive<{ due_value: number; due_unit: DueUnit }>({ due_value: 24, due_unit: 'hour' })
const error = ref('')
const errorMessage = ref('')
// Link baru hanya hidup di state komponen ini; token mentah tidak disimpan di mana pun.
const result = ref<ActivationResult | null>(null)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    Object.assign(form, { due_value: 24, due_unit: 'hour' as DueUnit })
    error.value = ''
    errorMessage.value = ''
    result.value = null
  },
  { immediate: true },
)

const pending = computed(() => mutation.isPending.value)

// Selama request berjalan semua jalur tutup diabaikan: token sudah bisa diputar di server dan
// link baru hanya ada di response ini.
function requestClose() {
  if (pending.value) return
  emit('close')
}

async function submit() {
  if (pending.value || result.value || !props.row) return
  error.value = validateRenewForm(form.due_value, form.due_unit) ?? ''
  if (error.value) return
  errorMessage.value = ''
  try {
    result.value = await mutation.mutateAsync({
      id: props.row.id,
      payload: buildRenewPayload(form.due_value, form.due_unit),
    })
    emit('renewed')
  } catch (e) {
    errorMessage.value = renewErrorMessage(e)
  }
}

const inputClass =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950'
</script>

<template>
  <BaseModal
    :open="open"
    :title="`Perbarui link — ${row?.page_title ?? ''}`"
    @close="requestClose()"
  >
    <div v-if="result && row" class="space-y-4 text-sm" role="status">
      <p
        class="rounded-lg bg-emerald-50 p-3 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
      >
        Link preview diperbarui. Link preview lama tidak berlaku lagi.
      </p>
      <ActivationLinksPanel
        :buyer-name="row.buyer_name"
        :buyer-contact="row.buyer_contact"
        :page-title="row.page_title"
        :preview-url="result.preview_url"
        :payment-url="result.payment_url"
      />
      <div class="flex justify-end pt-2">
        <BaseButton type="button" variant="secondary" @click="requestClose()">Selesai</BaseButton>
      </div>
    </div>

    <form v-else class="space-y-4 text-sm" novalidate @submit.prevent="submit()">
      <p class="text-gray-600 dark:text-gray-300">
        Membuat link preview baru untuk <strong>{{ row?.buyer_name }}</strong
        >. Link preview lama tidak berlaku lagi. Link pembayaran tidak berubah.
      </p>
      <div class="space-y-1">
        <span class="font-medium">Link preview berlaku selama</span>
        <div class="flex gap-2">
          <input
            v-model.number="form.due_value"
            name="due_value"
            aria-label="Lama link preview berlaku"
            type="number"
            min="1"
            :class="inputClass"
          />
          <select
            v-model="form.due_unit"
            name="due_unit"
            aria-label="Satuan masa berlaku"
            :class="inputClass"
          >
            <option v-for="(label, unit) in dueUnitLabel" :key="unit" :value="unit">
              {{ label }}
            </option>
          </select>
        </div>
        <span v-if="error" class="block text-xs text-red-600">{{ error }}</span>
      </div>

      <p v-if="errorMessage" class="text-red-600" role="alert">{{ errorMessage }}</p>

      <div class="flex justify-end gap-2 pt-2">
        <BaseButton type="button" variant="secondary" :disabled="pending" @click="requestClose()">
          Batal
        </BaseButton>
        <BaseButton type="submit" :disabled="pending">
          {{ pending ? 'Memperbarui...' : 'Perbarui link' }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
