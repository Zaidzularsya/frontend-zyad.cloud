<script setup lang="ts">
defineProps<{
  name: string
  label: string
  type?: string
  modelValue?: string
  placeholder?: string
  error?: string
  autocomplete?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <label class="block">
    <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
      {{ label }}
    </span>
    <input
      :id="name"
      :name="name"
      :type="type || 'text'"
      :value="modelValue"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-gray-400 focus:border-brand-500 focus:ring-3 focus:ring-brand-100 dark:bg-gray-950 dark:focus:ring-brand-900"
      :class="{ 'border-red-500': error }"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span v-if="error" class="mt-1 block text-xs text-red-600">{{ error }}</span>
  </label>
</template>
