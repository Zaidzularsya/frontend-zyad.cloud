<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import flatpickr from 'flatpickr'
import type { Instance } from 'flatpickr/dist/types/instance'

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const input = ref<HTMLInputElement>()
let instance: Instance | undefined

onMounted(() => {
  if (!input.value) return
  instance = flatpickr(input.value, {
    dateFormat: 'Y-m-d',
    defaultDate: props.modelValue || undefined,
    onChange: (_, value) => emit('update:modelValue', value),
  })
})

watch(
  () => props.modelValue,
  (value) => instance?.setDate(value, false),
)

onBeforeUnmount(() => instance?.destroy())
</script>

<template>
  <input
    ref="input"
    type="text"
    :placeholder="placeholder || 'Pilih tanggal'"
    class="rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
  />
</template>
