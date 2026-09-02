<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue?: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

const swatch = computed(() =>
  props.modelValue && HEX.test(props.modelValue) ? props.modelValue : '#ffffff',
)

function set(value: string) {
  emit('update:modelValue', value.trim())
}
</script>

<template>
  <div class="flex items-center gap-2">
    <input
      type="color"
      :value="swatch"
      class="h-9 w-10 cursor-pointer rounded border border-gray-200 dark:border-gray-700"
      @input="set(($event.target as HTMLInputElement).value)"
    />
    <input
      type="text"
      :value="modelValue ?? ''"
      placeholder="#0f172a atau kosong"
      class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
      @input="set(($event.target as HTMLInputElement).value)"
    />
  </div>
</template>
