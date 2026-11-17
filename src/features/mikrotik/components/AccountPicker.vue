<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { useAccountSearchQuery } from '@/features/mikrotik/api/mikrotik.queries'
import type { AccountRef } from '@/features/mikrotik/types'

const props = defineProps<{ initialQuery?: string; label: string }>()
const emit = defineEmits<{ (e: 'pick', account: AccountRef): void; (e: 'cancel'): void }>()

const input = ref(props.initialQuery ?? '')
const debounced = ref(input.value.trim())
let timer: ReturnType<typeof setTimeout> | undefined
watch(input, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    debounced.value = value.trim()
  }, 300)
})
onBeforeUnmount(() => clearTimeout(timer))

const query = useAccountSearchQuery(debounced)
const accounts = computed(() => query.data.value ?? [])
</script>

<template>
  <div
    class="w-64 rounded-lg border bg-white p-2 shadow-lg dark:bg-gray-900"
    @keydown.esc="emit('cancel')"
  >
    <label class="block text-xs text-gray-500">
      <span class="sr-only">{{ label }}</span>
      <input
        v-model="input"
        type="search"
        placeholder="Cari nama atau nomor HP"
        class="w-full rounded-lg border bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
        autofocus
      />
    </label>
    <p v-if="query.isFetching.value" class="px-1 py-2 text-xs text-gray-500">Mencari...</p>
    <p v-else-if="debounced && accounts.length === 0" class="px-1 py-2 text-xs text-gray-500">
      Pelanggan tidak ditemukan.
    </p>
    <ul v-if="accounts.length" class="mt-1 max-h-48 overflow-y-auto">
      <li v-for="a in accounts" :key="a.id">
        <button
          type="button"
          class="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          @click="emit('pick', a)"
        >
          <span class="font-medium">{{ a.name }}</span>
          <span class="block text-xs text-gray-500">{{ a.phone || a.email }}</span>
        </button>
      </li>
    </ul>
    <button
      type="button"
      class="mt-1 text-xs text-gray-500 hover:underline"
      @click="emit('cancel')"
    >
      Batal
    </button>
  </div>
</template>
