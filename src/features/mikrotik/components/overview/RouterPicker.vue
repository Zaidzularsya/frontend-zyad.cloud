<script setup lang="ts">
import { useId } from 'vue'

import type { Router } from '@/features/mikrotik/types'

// Induk menyembunyikan pemilih bila hanya ada satu router.
defineProps<{ routers: Router[]; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [id: string] }>()
const id = useId()

function onChange(event: Event) {
  emit('update:modelValue', (event.target as HTMLSelectElement).value)
}
</script>

<template>
  <div class="flex w-full flex-col gap-1 sm:w-auto">
    <label :for="id" class="text-sm font-medium text-gray-700 dark:text-gray-300">Router</label>
    <select
      :id="id"
      :value="modelValue"
      class="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100 sm:min-w-56 dark:border-gray-700 dark:bg-gray-900 dark:focus:ring-brand-900"
      @change="onChange"
    >
      <option v-for="r in routers" :key="r.id" :value="r.id">{{ r.name }}</option>
    </select>
  </div>
</template>
