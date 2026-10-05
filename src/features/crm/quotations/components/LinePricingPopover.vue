<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import {
  FREQUENCIES,
  normalizePricing,
  pricingShort,
  type PricingAttrs,
} from '@/features/catalog/utils/pricing'

const props = defineProps<{
  modelValue: PricingAttrs
  disabled: boolean
  /** Dipakai membedakan nama radio antar baris. */
  uid: string
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: PricingAttrs): void }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

function update(patch: Partial<PricingAttrs>) {
  emit('update:modelValue', normalizePricing({ ...props.modelValue, ...patch }))
}

function onDocumentClick(event: MouseEvent) {
  if (open.value && root.value && !root.value.contains(event.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div ref="root" class="relative inline-block">
    <button
      type="button"
      class="rounded-full border px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50 disabled:cursor-default disabled:hover:bg-transparent dark:text-gray-300 dark:hover:bg-gray-800"
      :disabled="disabled"
      :aria-expanded="open"
      @click="open = !open"
    >
      {{ pricingShort(modelValue) }}
    </button>
    <div
      v-if="open && !disabled"
      class="absolute left-0 top-full z-20 mt-1 w-56 space-y-3 rounded-lg border bg-white p-3 text-sm shadow-lg dark:bg-gray-900"
      role="dialog"
      aria-label="Atribut harga baris"
    >
      <div class="space-y-1">
        <label class="flex items-center gap-2">
          <input
            type="radio"
            :name="`charge-${uid}`"
            :checked="modelValue.charge_type === 'one_time'"
            @change="update({ charge_type: 'one_time' })"
          />
          Sekali bayar
        </label>
        <label class="flex items-center gap-2">
          <input
            type="radio"
            :name="`charge-${uid}`"
            :checked="modelValue.charge_type === 'recurring'"
            @change="update({ charge_type: 'recurring' })"
          />
          Berulang
        </label>
      </div>
      <label v-if="modelValue.charge_type === 'recurring'" class="block space-y-1">
        <span class="text-xs text-gray-500">Frekuensi</span>
        <select
          :value="modelValue.billing_frequency ?? 'monthly'"
          class="w-full rounded-md border bg-white px-2 py-1.5 text-sm dark:bg-gray-950"
          @change="
            update({
              billing_frequency: ($event.target as HTMLSelectElement)
                .value as PricingAttrs['billing_frequency'],
            })
          "
        >
          <option v-for="f in FREQUENCIES" :key="f.value" :value="f.value">{{ f.label }}</option>
        </select>
      </label>
      <div class="space-y-1">
        <label class="flex items-center gap-2">
          <input
            type="radio"
            :name="`timing-${uid}`"
            :checked="modelValue.payment_timing === 'prepaid'"
            @change="update({ payment_timing: 'prepaid' })"
          />
          Prabayar
        </label>
        <label class="flex items-center gap-2">
          <input
            type="radio"
            :name="`timing-${uid}`"
            :checked="modelValue.payment_timing === 'postpaid'"
            @change="update({ payment_timing: 'postpaid' })"
          />
          Pascabayar
        </label>
      </div>
    </div>
  </div>
</template>
