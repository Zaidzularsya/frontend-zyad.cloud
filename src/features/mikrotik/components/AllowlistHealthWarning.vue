<script setup lang="ts">
import { computed } from 'vue'

import { useAllowlistHealthQuery } from '@/features/mikrotik/api/mikrotik.queries'
import { useAuthStore } from '@/stores/auth.store'

// Only for isolir-ready routers: before setup there is no allowlist to check.
// The endpoint requires mikrotik_router.setup, so it is never called without it (no 403).
const props = defineProps<{ routerId: string; ready: boolean }>()
const auth = useAuthStore()
const query = useAllowlistHealthQuery(
  computed(() => props.routerId),
  computed(() => props.ready && auth.can('mikrotik_router.setup')),
)
const unresolved = computed(() => (props.ready ? (query.data.value?.unresolved ?? 0) : 0))
</script>

<template>
  <p v-if="unresolved > 0" class="mt-1 text-xs text-amber-700 dark:text-amber-300" role="status">
    DNS router bermasalah: pelanggan terisolir mungkin tidak bisa membuka halaman bayar.
  </p>
</template>
