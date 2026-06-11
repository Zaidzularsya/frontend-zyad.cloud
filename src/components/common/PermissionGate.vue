<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store'
import type { Permission } from '@/types/auth'

defineProps<{ permission: Permission }>()
const auth = useAuthStore()
</script>

<template>
  <slot v-if="auth.can(permission)" />
  <slot v-else name="fallback" />
</template>
