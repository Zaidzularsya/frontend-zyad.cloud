<script setup lang="ts">
import { computed } from 'vue'

import type { CustomerStatus } from '@/features/mikrotik/types'

const props = defineProps<{ state?: CustomerStatus }>()

const kind = computed(() => {
  if (props.state?.isolation_state === 'isolated') return 'isolated'
  if (props.state?.exempt) return 'exempt'
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
    v-else-if="kind === 'exempt'"
    class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
    >Dikecualikan</span
  >
</template>
