<script setup lang="ts">
import type { LandingPage } from '@/features/landing/shared/types/landing.types'

defineProps<{
  pages: LandingPage[]
  modelValue: string
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()
</script>

<template>
  <label class="block text-sm font-medium">
    Landing page
    <select
      :value="modelValue"
      class="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="page in pages" :key="page.id" :value="page.id">
        {{ page.title || page.name }} — /{{ page.slug }}
      </option>
    </select>
  </label>
</template>
