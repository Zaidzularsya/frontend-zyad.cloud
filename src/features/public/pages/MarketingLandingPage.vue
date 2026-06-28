<script setup lang="ts">
import DynamicLandingPage from '@/features/landing/renderer/pages/DynamicLandingPage.vue'

type MarketingNavItem = {
  id?: string
  label: string
  href: string
  target?: string
  children?: MarketingNavItem[]
}

const emit = defineEmits<{
  (event: 'landing-navigation', items: MarketingNavItem[]): void
}>()

function forwardNavigation(items: MarketingNavItem[]) {
  emit('landing-navigation', items)
}
</script>

<template>
  <DynamicLandingPage slug="public-marketing" @landing-navigation="forwardNavigation" />
</template>
