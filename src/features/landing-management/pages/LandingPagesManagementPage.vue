<script setup lang="ts">
import LandingManagementWorkspace from '@/features/landing/components/LandingManagementWorkspace.vue'

withDefaults(
  defineProps<{
    title?: string
    description?: string
    mode?: 'workspace' | 'platform'
  }>(),
  {
    title: 'Pages',
    description: 'Kelola page, create slug, publish, dan unpublish dari satu cockpit.',
    mode: 'workspace',
  },
)
</script>

<template>
  <LandingManagementWorkspace :title="title" :description="description" :mode="mode" />
</template>
