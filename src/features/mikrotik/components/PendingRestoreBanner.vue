<script setup lang="ts">
import { computed } from 'vue'

import { useTaskSummaryQuery } from '@/features/mikrotik/api/mikrotik.queries'

const summaryQuery = useTaskSummaryQuery()
const oldestRestore = computed(() => summaryQuery.data.value?.oldest_pending_restore_at ?? null)
const oldestMinutes = computed(() => {
  if (!oldestRestore.value) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(oldestRestore.value).getTime()) / 60_000))
})
</script>

<template>
  <div
    v-if="oldestRestore"
    class="rounded-lg bg-red-100 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
    role="alert"
  >
    Ada pemulihan yang tertunda: pelanggan sudah bayar tapi belum dibuka (tertua
    {{ oldestMinutes }} menit).
  </div>
</template>
