<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Loader2 } from 'lucide-vue-next'

import { pageTemplatesApi } from '@/features/landing/shared/api/page-templates.api'
import type { PageTemplateDetail } from '@/features/landing/shared/types/page-template.types'
import {
  buildTemplatePreviewChrome,
  toChromePlans,
} from '@/features/landing/builder/templates/preview-chrome'
import { useLandingChromeStore } from '@/stores/landingChrome'
import { useLandingPricingStore } from '@/stores/landingPricing'
import { useTenantStore } from '@/stores/tenant.store'
import GrapesPageRenderer from '../components/GrapesPageRenderer.vue'

/**
 * Halaman penuh untuk iframe preview galeri template. Berupa route SPA (bukan
 * srcdoc) supaya media query mengikuti lebar iframe = lebar perangkat.
 */
const route = useRoute()
const chromeStore = useLandingChromeStore()
const pricingStore = useLandingPricingStore()
const tenantStore = useTenantStore()

const template = ref<PageTemplateDetail | null>(null)
const loading = ref(true)
const errorMessage = ref('')

const chrome = computed(() =>
  buildTemplatePreviewChrome({
    isPlatform: tenantStore.isPlatformOrganization,
    brand: {
      name: chromeStore.canvasBranding.companyName,
      logoUrl: chromeStore.canvasBranding.logoUrl,
    },
    nav: chromeStore.canvasNav,
    footerNav: chromeStore.canvasFooterNav,
    plans: toChromePlans(pricingStore.canvasPlans),
  }),
)

onMounted(async () => {
  // Chrome dan paket harga bersifat best-effort: kegagalan memakai fallback.
  const bestEffort = Promise.allSettled([chromeStore.load(), pricingStore.load()])
  try {
    template.value = await pageTemplatesApi.get(String(route.params.id))
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status
    errorMessage.value =
      status === 404 ? 'Template tidak lagi tersedia.' : 'Preview template belum dapat dimuat.'
  } finally {
    loading.value = false
  }
  await bestEffort
})
</script>

<template>
  <div class="min-h-screen bg-white">
    <div v-if="loading" class="flex min-h-screen items-center justify-center text-gray-500">
      <Loader2 class="size-5 animate-spin" aria-hidden="true" />
    </div>
    <p v-else-if="errorMessage" class="p-8 text-center text-sm text-gray-600" role="alert">
      {{ errorMessage }}
    </p>
    <GrapesPageRenderer
      v-else-if="template"
      :html="template.html"
      :css="template.css"
      :chrome="chrome"
      :title="template.name"
    />
  </div>
</template>
