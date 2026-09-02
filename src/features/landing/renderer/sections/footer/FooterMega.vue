<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BrandLogo from '@/features/branding/components/BrandLogo.vue'
import type { FooterContent } from '../../../shared/types/landing.types'

const props = defineProps<{
  content: FooterContent
}>()

const columnGridClass = computed(() => {
  const count = props.content.columns?.length ?? 0
  if (count >= 3) return 'grid-cols-2 sm:grid-cols-3'
  if (count === 2) return 'grid-cols-2'
  return 'grid-cols-1'
})

const logoLoadFailed = ref(false)
watch(
  () => props.content.logoUrl,
  () => {
    logoLoadFailed.value = false
  },
)
</script>

<template>
  <footer class="bg-surface-container-lowest border-t border-outline-variant/30 py-16">
    <div class="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-12 mb-12">
        <!-- Brand Info -->
        <div class="md:col-span-4">
          <div class="flex items-center gap-2 mb-6">
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
          <p class="font-body-md text-on-surface-variant max-w-sm">
            {{ content.description }}
          </p>

          <a
            v-if="content.secondaryCta"
            :href="content.secondaryCta.url"
            class="mt-6 inline-flex items-center rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-on-secondary"
          >
            {{ content.secondaryCta.label }}
          </a>
        </div>

        <!-- Links Columns -->
        <div class="md:col-span-8 grid gap-8" :class="columnGridClass">
          <div v-for="(col, idx) in content.columns" :key="idx">
            <h4 class="font-headline-md text-lg text-primary mb-6">{{ col.title }}</h4>
            <ul class="space-y-4">
              <li v-for="(link, lIdx) in col.links" :key="lIdx">
                <a
                  :href="link.href"
                  class="font-body-md text-on-surface-variant hover:text-secondary transition-colors"
                >
                  {{ link.label }}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Trust badges -->
      <div
        v-if="content.trustBadges && content.trustBadges.length > 0"
        class="flex flex-wrap items-center gap-8 border-t border-outline-variant/20 py-8"
      >
        <img
          v-for="(badge, idx) in content.trustBadges"
          :key="idx"
          :src="badge.image_url"
          :alt="badge.label"
          class="h-8 w-auto object-contain opacity-80"
        />
      </div>

      <!-- Copyright & Bottom Line -->
      <div
        class="border-t border-outline-variant/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4"
      >
        <p class="font-body-md text-on-surface-variant text-sm text-center md:text-left">
          {{ content.copyright }}
        </p>
      </div>
    </div>
  </footer>
</template>
