<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useToast } from '@/components/ui/toast'

import { useCreateActivationInvoiceMutation } from '../api/activation.queries'
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

const inputClass =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950'
</script>

<template>
  <BaseModal
    :open="open"
    :title="`${renewal ? 'Perpanjang' : 'Create invoice'} — ${pageTitle}`"
    @close="emit('close')"
  >
    <div v-if="result" class="space-y-4 text-sm">
      <p
        class="rounded-lg bg-emerald-50 p-3 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
      >
        Invoice berhasil dibuat.
      </p>
      <label class="block space-y-1">
        <span class="font-medium">Link preview untuk pembeli</span>
        <div class="flex gap-2">
          <input name="preview_url" readonly :value="result.preview_url" :class="inputClass" />
          <BaseButton
            type="button"
            variant="outline"
            @click="copy(result.preview_url, 'Link preview')"
          >
            Salin
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
        </div>
      </label>
      <div class="flex justify-end pt-2">
        <BaseButton type="button" @click="emit('close')">Selesai</BaseButton>
      </div>
    </div>

    <form v-else class="space-y-4 text-sm" novalidate @submit.prevent="submit()">
      <label class="block space-y-1">
        <span class="font-medium">Nama penagih</span>
        <input v-model="form.buyer_name" name="buyer_name" maxlength="200" :class="inputClass" />
        <span v-if="errors.buyer_name" class="block text-xs text-red-600">{{
          errors.buyer_name
        }}</span>
      </label>
      <label class="block space-y-1">
        <span class="font-medium">Kontak (WhatsApp/telepon)</span>
        <input
          v-model="form.buyer_contact"
          name="buyer_contact"
          maxlength="50"
          :class="inputClass"
        />
        <span v-if="errors.buyer_contact" class="block text-xs text-red-600">{{
          errors.buyer_contact
        }}</span>
      </label>
      <label class="block space-y-1">
        <span class="font-medium">Email (opsional)</span>
        <input v-model="form.buyer_email" name="buyer_email" type="email" :class="inputClass" />
        <span v-if="errors.buyer_email" class="block text-xs text-red-600">{{
          errors.buyer_email
        }}</span>
      </label>
      <label class="block space-y-1">
        <span class="font-medium">Harga (IDR)</span>
        <input
          v-model="form.price"
          name="price"
          inputmode="decimal"
          placeholder="150000"
          :class="inputClass"
        />
        <span v-if="errors.price" class="block text-xs text-red-600">{{ errors.price }}</span>
      </label>
      <div class="space-y-1">
        <span class="font-medium">Masa aktif halaman</span>
        <div class="flex gap-2">
          <input
            v-model.number="form.duration_value"
            name="duration_value"
            type="number"
            min="1"
            :class="inputClass"
          />
          <select v-model="form.duration_unit" name="duration_unit" :class="inputClass">
            <option v-for="(label, unit) in durationUnitLabel" :key="unit" :value="unit">
              {{ label }}
            </option>
          </select>
        </div>
        <span v-if="errors.duration_value" class="block text-xs text-red-600">{{
          errors.duration_value
        }}</span>
      </div>
      <div class="space-y-1">
        <span class="font-medium">Jatuh tempo invoice</span>
        <div class="flex gap-2">
          <input
            v-model.number="form.due_value"
            name="due_value"
            type="number"
            min="1"
            :class="inputClass"
          />
          <select v-model="form.due_unit" name="due_unit" :class="inputClass">
            <option v-for="(label, unit) in dueUnitLabel" :key="unit" :value="unit">
              {{ label }}
            </option>
          </select>
        </div>
        <span v-if="errors.due_value" class="block text-xs text-red-600">{{
          errors.due_value
        }}</span>
      </div>

      <p v-if="errorMessage" class="text-red-600" role="alert">{{ errorMessage }}</p>

      <div class="flex justify-end gap-2 pt-2">
        <BaseButton type="button" variant="secondary" @click="emit('close')">Batal</BaseButton>
        <BaseButton type="submit" :disabled="pending">
          {{ pending ? 'Membuat...' : 'Buat invoice' }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
