<script setup lang="ts">
import { computed } from 'vue'

import { useAllowlistHealthQuery } from '@/features/mikrotik/api/mikrotik.queries'

// Only for isolir-ready routers: before setup there is no allowlist to check.
const props = defineProps<{ routerId: string; ready: boolean }>()
const query = useAllowlistHealthQuery(
  computed(() => props.routerId),
  computed(() => props.ready),
)
const unresolved = computed(() => (props.ready ? (query.data.value?.unresolved ?? 0) : 0))
</script>

<template>
  <p v-if="unresolved > 0" class="mt-1 text-xs text-amber-700 dark:text-amber-300" role="status">
    DNS router bermasalah: pelanggan terisolir mungkin tidak bisa membuka halaman bayar.
  </p>
</template>
