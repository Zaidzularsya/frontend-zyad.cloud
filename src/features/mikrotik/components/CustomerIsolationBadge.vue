<script setup lang="ts">
import { computed } from 'vue'

import type { CustomerStatus } from '@/features/mikrotik/types'
import { isExpired } from '@/features/mikrotik/utils/preview'

const props = defineProps<{ state?: CustomerStatus }>()

const kind = computed(() => {
  const s = props.state
  if (s?.isolation_state === 'isolated') return 'isolated'
  if (s?.pending_isolation) return 'pending'
  // Pengecualian yang sudah lewat tidak boleh terbaca sebagai masih berlaku.
  if (s?.exempt && !isExpired(s.exempted_until ?? null)) return 'exempt'
  return null
})
</script>

<template>
  <span
    v-if="kind === 'isolated'"
    class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-200"
    >Terisolir</span
  >
  <span
    v-else-if="kind === 'pending'"
    class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200"
    title="Akan diisolir begitu isolir otomatis aktif"
    >Menunggu Isolir</span
  >
  <span
    v-else-if="kind === 'exempt'"
    class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
    >Dikecualikan</span
  >
</template>
