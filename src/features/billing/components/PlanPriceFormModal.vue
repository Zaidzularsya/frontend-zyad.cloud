<script setup lang="ts">
import { reactive, watch } from 'vue'
import { Loader2 } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import TextField from '@/components/form/TextField.vue'
import type {
  PlatformBillingInterval,
  PlatformBillingPlanPrice,
  PlatformBillingPlanPricePayload,
} from '@/features/billing/api/platform-billing.api'

const props = defineProps<{
  isOpen: boolean
  mode: 'create' | 'edit'
  priceToEdit: PlatformBillingPlanPrice | null
  isSubmitting: boolean
  serverError: string
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: PlatformBillingPlanPricePayload]
}>()

const priceIntervalOptions: Array<{ value: PlatformBillingInterval; label: string }> = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one_time', label: 'One time' },
  { value: 'custom', label: 'Custom' },
]

const form = reactive({
  billing_interval: 'monthly' as PlatformBillingInterval,
  currency: 'IDR',
  amount: '',
  is_active: true,
})

const fieldError = reactive({ message: '' })

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return
    fieldError.message = ''
    if (props.mode === 'edit' && props.priceToEdit) {
      form.billing_interval = props.priceToEdit.billing_interval
      form.currency = props.priceToEdit.currency
      form.amount = props.priceToEdit.amount.replace(/\.00$/, '')
      form.is_active = props.priceToEdit.is_active
    } else {
      form.billing_interval = 'monthly'
      form.currency = 'IDR'
      form.amount = ''
      form.is_active = true
    }
  },
  { immediate: true },
)

function normalizeAmount(value: string) {
  const numeric = Number(String(value).replace(/[^0-9.]/g, ''))
  return Number.isFinite(numeric) ? numeric.toFixed(2) : value
}

function submit() {
  if (!form.amount.trim()) {
    fieldError.message = 'Jumlah harga wajib diisi.'
    return
  }
  fieldError.message = ''
  emit('submit', {
    billing_interval: form.billing_interval,
    currency: form.currency.trim() || 'IDR',
    amount: normalizeAmount(form.amount),
    is_active: form.is_active,
  })
}
</script>

<template>
  <BaseModal
    :open="isOpen"
    :title="mode === 'create' ? 'Tambah harga plan' : 'Edit harga plan'"
    @close="emit('close')"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <div
        v-if="serverError || fieldError.message"
        class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
      >
        {{ serverError || fieldError.message }}
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Interval harga
          </span>
          <select
            v-model="form.billing_interval"
            class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-950"
          >
            <option
              v-for="option in priceIntervalOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
        <TextField v-model="form.currency" name="price-currency" label="Mata uang" />
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <TextField v-model="form.amount" name="price-amount" label="Jumlah" placeholder="199000" />
        <label
          class="mt-7 flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800"
        >
          <input v-model="form.is_active" type="checkbox" class="size-4 rounded border-gray-300" />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-200">Harga aktif</span>
        </label>
      </div>

      <div class="flex justify-end gap-3 pt-2">
        <BaseButton type="button" variant="outline" @click="emit('close')">Batal</BaseButton>
        <BaseButton type="submit" :disabled="isSubmitting">
          <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
          {{ mode === 'create' ? 'Tambah harga' : 'Simpan harga' }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
