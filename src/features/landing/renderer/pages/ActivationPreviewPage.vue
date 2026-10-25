<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRoute } from 'vue-router'

import DynamicLandingPage from './DynamicLandingPage.vue'

/**
 * Pratinjau halaman berbayar untuk pembeli (`/preview/:token` di host tenant).
 * Renderer publik yang sama dengan `/:slug`; datanya dari
 * GET /public/landing/preview/:token. Token tidak di-log maupun disimpan.
 */
const route = useRoute()
const token = computed(() => String(route.params.token ?? ''))

// Link berisi token akses: jangan diindeks mesin pencari.
let robots: HTMLMetaElement | null = null
onMounted(() => {
  robots = document.createElement('meta')
  robots.name = 'robots'
  robots.content = 'noindex, nofollow'
  document.head.appendChild(robots)
})
onBeforeUnmount(() => robots?.remove())
</script>

<template>
  <div>
    <div
      class="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-amber-100 px-4 py-2 text-center text-sm text-amber-900 dark:bg-amber-900 dark:text-amber-50"
      role="status"
      data-testid="preview-banner"
    >
      <span class="font-semibold">Pratinjau</span>
      <span>Link ini pribadi, jangan dibagikan.</span>
    </div>
    <DynamicLandingPage :key="token" :preview-token="token" />
  </div>
</template>
