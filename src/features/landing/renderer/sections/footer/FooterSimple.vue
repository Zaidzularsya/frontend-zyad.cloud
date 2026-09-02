<script setup lang="ts">
import { ref, watch } from 'vue'
import BrandLogo from '@/features/branding/components/BrandLogo.vue'
import type { FooterContent } from '../../../shared/types/landing.types'

const props = defineProps<{
  content: FooterContent
}>()

const logoLoadFailed = ref(false)
watch(
  () => props.content.logoUrl,
  () => {
    logoLoadFailed.value = false
  },
)
</script>

<template>
  <footer class="bg-surface-container-lowest border-t border-outline-variant/30 py-12">
    <div
      class="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop flex flex-col items-center gap-6 text-center"
    >
      <div class="flex items-center gap-2">
        <img
          v-if="content.logoUrl && !logoLoadFailed"
          :src="content.logoUrl"
          :alt="content.brandName"
          class="h-10 w-auto object-contain"
          @error="logoLoadFailed = true"
        />
        <BrandLogo v-else class="h-10" />
        <span class="font-display-xl text-2xl font-bold tracking-tight text-primary">{{
          content.brandName
        }}</span>
      </div>

      <p class="font-body-md text-on-surface-variant text-sm">
        {{ content.copyright }}
      </p>
    </div>
  </footer>
</template>
