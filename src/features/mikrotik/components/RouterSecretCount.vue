<script setup lang="ts">
import { computed } from 'vue'

import { useSecretsQuery } from '@/features/mikrotik/api/mikrotik.queries'

// Satu query per_page=1 per router hanya untuk meta.total; cukup untuk jumlah router yang kecil.
const props = defineProps<{ routerId: string }>()
const params = computed(() => ({ router_id: props.routerId, per_page: 1 }))
const query = useSecretsQuery(params)
</script>

<template>
  <span>{{ query.data.value?.meta?.total ?? '-' }}</span>
</template>
