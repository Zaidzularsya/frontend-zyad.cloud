<script setup lang="ts">
import type { LandingPage } from '@/features/landing/shared/types/landing.types'

withDefaults(
  defineProps<{
    pages: LandingPage[]
    modelValue: string
    /** Inline select without the block label — fits a toolbar/topbar row. */
    compact?: boolean
  }>(),
  { compact: false },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()
</script>

<template>
  <label v-if="!compact" class="block text-sm font-medium">
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
  <select
    v-else
    :value="modelValue"
    aria-label="Landing page"
    class="max-w-[220px] truncate rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
    @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
  >
    <option v-for="page in pages" :key="page.id" :value="page.id">
      {{ page.title || page.name }} — /{{ page.slug }}
    </option>
  </select>
</template>
