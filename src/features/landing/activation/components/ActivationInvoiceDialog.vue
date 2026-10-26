<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useToast } from '@/components/ui/toast'

import { useCreateActivationInvoiceMutation } from '../api/activation.queries'
import { buildShareMessage, buildWhatsAppUrl } from '../utils/activation-share'
import {
  activationErrorMessage,
  buildActivationPayload,
  durationUnitLabel,
  dueUnitLabel,
  validateActivationForm,
  type ActivationFormErrors,
  type ActivationFormState,
  type ActivationResult,
} from '../utils/activation-state'

const props = defineProps<{
  open: boolean
  pageId: string
  pageTitle: string
  /** Perpanjangan halaman yang sudah kedaluwarsa (hanya mengubah judul). */
  renewal?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created', result: ActivationResult): void
}>()

const toast = useToast()
const mutation = useCreateActivationInvoiceMutation()

function initialForm(): ActivationFormState {
  return {
    buyer_name: '',
    buyer_contact: '',
    buyer_email: '',
    price: '',
    duration_value: 1,
    duration_unit: 'month',
    due_value: 1,
    due_unit: 'hour',
  }
}

const form = reactive<ActivationFormState>(initialForm())
const errors = ref<ActivationFormErrors>({})
const errorMessage = ref('')
// Link hanya hidup di state komponen ini; token preview tidak boleh disimpan di mana pun.
const result = ref<ActivationResult | null>(null)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    Object.assign(form, initialForm())
    errors.value = {}
    errorMessage.value = ''
    result.value = null
  },
  { immediate: true },
)

const pending = computed(() => mutation.isPending.value)

// Selama request berjalan, semua jalur tutup (Batal, X, ESC, backdrop) diabaikan: invoice bisa
// sudah terbit di server dan link preview hanya ada di response ini.
function requestClose() {
  if (pending.value) return
  emit('close')
}

async function submit() {
  if (pending.value || result.value) return
  errors.value = validateActivationForm(form)
  if (Object.keys(errors.value).length > 0) return
  errorMessage.value = ''
  try {
    const created = await mutation.mutateAsync({
      pageId: props.pageId,
      payload: buildActivationPayload(form),
    })
    result.value = created
    emit('created', created)
  } catch (error) {
    errorMessage.value = activationErrorMessage(error)
  }
}

async function copy(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(`${label} disalin.`)
  } catch {
    toast.error('Gagal menyalin. Salin manual dari kolom di atas.')
  }
}

// Membuka WhatsApp dengan nomor pelanggan dan pesan terisi; kirimnya tetap lewat tombol WhatsApp.
function shareWhatsApp(kind: 'all' | 'preview' | 'payment') {
  if (!result.value) return
  const message = buildShareMessage({
    buyerName: form.buyer_name,
    pageTitle: props.pageTitle,
    previewUrl: kind === 'payment' ? undefined : result.value.preview_url,
    paymentUrl: kind === 'preview' ? undefined : result.value.payment_url,
  })
  const url = buildWhatsAppUrl(form.buyer_contact, message)
  if (!url) {
    toast.error('Nomor WhatsApp pelanggan tidak valid.')
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

const inputClass =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950'
</script>

<template>
  <BaseModal
    :open="open"
    :title="`${renewal ? 'Perpanjang' : 'Create invoice'} — ${pageTitle}`"
    @close="requestClose()"
  >
    <div v-if="result" class="space-y-4 text-sm" role="status">
      <p
        class="rounded-lg bg-emerald-50 p-3 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
      >
        Invoice berhasil dibuat.
      </p>
      <label class="block space-y-1">
        <span class="font-medium">Link preview untuk pelanggan</span>
        <div class="flex gap-2">
          <input name="preview_url" readonly :value="result.preview_url" :class="inputClass" />
          <BaseButton
            type="button"
            variant="outline"
            @click="copy(result.preview_url, 'Link preview')"
          >
            Salin
          </BaseButton>
          <BaseButton
            type="button"
            variant="outline"
            data-testid="share-whatsapp-preview"
            @click="shareWhatsApp('preview')"
          >
            WhatsApp
          </BaseButton>
        </div>
        <span class="block text-xs text-amber-700 dark:text-amber-300">
          Link preview hanya ditampilkan sekali. Salin sekarang; setelah dialog ditutup link ini
          tidak bisa dilihat lagi.
        </span>
      </label>
      <label class="block space-y-1">
        <span class="font-medium">Link pembayaran</span>
        <div class="flex gap-2">
          <input name="payment_url" readonly :value="result.payment_url" :class="inputClass" />
          <BaseButton
            type="button"
            variant="outline"
            @click="copy(result.payment_url, 'Link pembayaran')"
          >
            Salin
          </BaseButton>
          <BaseButton
            type="button"
            variant="outline"
            data-testid="share-whatsapp-payment"
            @click="shareWhatsApp('payment')"
          >
            WhatsApp
          </BaseButton>
        </div>
      </label>
      <div class="flex flex-wrap justify-end gap-2 pt-2">
        <BaseButton type="button" data-testid="share-whatsapp-all" @click="shareWhatsApp('all')">
          Kirim ke WhatsApp pelanggan
        </BaseButton>
        <BaseButton type="button" variant="secondary" @click="requestClose()">Selesai</BaseButton>
      </div>
    </div>

    <form v-else class="space-y-4 text-sm" novalidate @submit.prevent="submit()">
      <label class="block space-y-1">
        <span class="font-medium">Nama pelanggan</span>
        <input
          v-model="form.buyer_name"
          name="buyer_name"
          :aria-invalid="!!errors.buyer_name"
          :aria-describedby="errors.buyer_name ? 'err-buyer_name' : undefined"
          maxlength="200"
          :class="inputClass"
        />
        <span v-if="errors.buyer_name" id="err-buyer_name" class="block text-xs text-red-600">{{
          errors.buyer_name
        }}</span>
      </label>
      <label class="block space-y-1">
        <span class="font-medium">Nomor WhatsApp pelanggan</span>
        <input
          v-model="form.buyer_contact"
          name="buyer_contact"
          :aria-invalid="!!errors.buyer_contact"
          :aria-describedby="errors.buyer_contact ? 'err-buyer_contact' : undefined"
          maxlength="50"
          inputmode="tel"
          placeholder="081234567890"
          :class="inputClass"
        />
        <span
          v-if="errors.buyer_contact"
          id="err-buyer_contact"
          class="block text-xs text-red-600"
          >{{ errors.buyer_contact }}</span
        >
      </label>
      <label class="block space-y-1">
        <span class="font-medium">Email (opsional)</span>
        <input
          v-model="form.buyer_email"
          name="buyer_email"
          :aria-invalid="!!errors.buyer_email"
          :aria-describedby="errors.buyer_email ? 'err-buyer_email' : undefined"
          type="email"
          :class="inputClass"
        />
        <span v-if="errors.buyer_email" id="err-buyer_email" class="block text-xs text-red-600">{{
          errors.buyer_email
        }}</span>
      </label>
      <label class="block space-y-1">
        <span class="font-medium">Harga (IDR)</span>
        <input
          v-model="form.price"
          name="price"
          :aria-invalid="!!errors.price"
          :aria-describedby="errors.price ? 'err-price' : undefined"
          inputmode="decimal"
          placeholder="150000"
          :class="inputClass"
        />
        <span v-if="errors.price" id="err-price" class="block text-xs text-red-600">{{
          errors.price
        }}</span>
      </label>
      <div class="space-y-1">
        <span class="font-medium">Masa aktif halaman</span>
        <div class="flex gap-2">
          <input
            v-model.number="form.duration_value"
            name="duration_value"
            aria-label="Lama masa aktif"
            :aria-describedby="errors.duration_value ? 'err-duration_value' : undefined"
            type="number"
            min="1"
            :class="inputClass"
          />
          <select
            v-model="form.duration_unit"
            name="duration_unit"
            aria-label="Satuan masa aktif"
            :class="inputClass"
          >
            <option v-for="(label, unit) in durationUnitLabel" :key="unit" :value="unit">
              {{ label }}
            </option>
          </select>
        </div>
        <span
          v-if="errors.duration_value"
          id="err-duration_value"
          class="block text-xs text-red-600"
          >{{ errors.duration_value }}</span
        >
      </div>
      <div class="space-y-1">
        <span class="font-medium">Jatuh tempo invoice</span>
        <div class="flex gap-2">
          <input
            v-model.number="form.due_value"
            name="due_value"
            aria-label="Lama jatuh tempo invoice"
            :aria-describedby="errors.due_value ? 'err-due_value' : undefined"
            type="number"
            min="1"
            :class="inputClass"
          />
          <select
            v-model="form.due_unit"
            name="due_unit"
            aria-label="Satuan jatuh tempo invoice"
            :class="inputClass"
          >
            <option v-for="(label, unit) in dueUnitLabel" :key="unit" :value="unit">
              {{ label }}
            </option>
          </select>
        </div>
        <span v-if="errors.due_value" id="err-due_value" class="block text-xs text-red-600">{{
          errors.due_value
        }}</span>
      </div>

      <p v-if="errorMessage" class="text-red-600" role="alert">{{ errorMessage }}</p>

      <div class="flex justify-end gap-2 pt-2">
        <BaseButton type="button" variant="secondary" :disabled="pending" @click="requestClose()">
          Batal
        </BaseButton>
        <BaseButton type="submit" :disabled="pending">
          {{ pending ? 'Membuat...' : 'Buat invoice' }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
