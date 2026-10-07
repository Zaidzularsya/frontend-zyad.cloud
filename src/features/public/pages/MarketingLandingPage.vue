<script setup lang="ts">
import { computed } from 'vue'
import { platformHost } from '@/config/env'
import DynamicLandingPage from '@/features/landing/renderer/pages/DynamicLandingPage.vue'
import type { LandingBranding } from '@/features/landing/shared/types/landing.types'

// Root path ini dipakai baik oleh domain platform sendiri (marketing site)
// maupun domain tenant (subdomain/custom domain yang di-bind ke landing
// page). Host platform memakai mode beranda (`home`: halaman is_homepage,
// fallback slug public-marketing di backend); di host lain, biarkan
// DynamicLandingPage resolve berdasarkan Host header supaya landing page
// tenant yang dibind ke domain itu yang tampil.
const isPlatformHost = computed(() => window.location.hostname === platformHost)

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
  (event: 'landing-header-mode', mode: 'section' | 'layout'): void
}>()

function forwardNavigation(items: MarketingNavItem[]) {
  emit('landing-navigation', items)
}

function forwardBranding(branding: LandingBranding) {
  emit('landing-branding', branding)
}

function forwardHeaderMode(mode: 'section' | 'layout') {
  emit('landing-header-mode', mode)
}
</script>

<template>
  <DynamicLandingPage
    :home="isPlatformHost"
    @landing-navigation="forwardNavigation"
    @landing-branding="forwardBranding"
    @landing-header-mode="forwardHeaderMode"
  />
</template>
