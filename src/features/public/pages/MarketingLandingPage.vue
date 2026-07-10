<script setup lang="ts">
import DynamicLandingPage from '@/features/landing/renderer/pages/DynamicLandingPage.vue'
import type { LandingBranding } from '@/features/landing/shared/types/landing.types'

type MarketingNavItem = {
  id?: string
  label: string
  href: string
  target?: string
  children?: MarketingNavItem[]
}

const emit = defineEmits<{
  (event: 'landing-navigation', items: MarketingNavItem[]): void
  (event: 'landing-branding', branding: LandingBranding): void
}>()

function forwardNavigation(items: MarketingNavItem[]) {
  emit('landing-navigation', items)
}

function forwardBranding(branding: LandingBranding) {
  emit('landing-branding', branding)
}
</script>

<template>
  <DynamicLandingPage
    slug="public-marketing"
    @landing-navigation="forwardNavigation"
    @landing-branding="forwardBranding"
  />
</template>
