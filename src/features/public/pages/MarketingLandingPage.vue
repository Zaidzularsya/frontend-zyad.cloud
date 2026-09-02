<script setup lang="ts">
import { computed } from 'vue'
import { platformHost } from '@/config/env'
import DynamicLandingPage from '@/features/landing/renderer/pages/DynamicLandingPage.vue'
import type { LandingBranding } from '@/features/landing/shared/types/landing.types'

// Root path ini dipakai baik oleh domain platform sendiri (marketing site)
// maupun domain tenant (subdomain/custom domain yang di-bind ke landing
// page). Slug "public-marketing" hanya dipaksa di host platform sendiri;
// di host lain, biarkan DynamicLandingPage resolve berdasarkan Host header
// supaya landing page tenant yang dibind ke domain itu yang tampil.
const marketingSlug = computed(() =>
  window.location.hostname === platformHost ? 'public-marketing' : undefined,
)

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
    :slug="marketingSlug"
    @landing-navigation="forwardNavigation"
    @landing-branding="forwardBranding"
  />
</template>
