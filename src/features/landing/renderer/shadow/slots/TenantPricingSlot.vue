<script setup lang="ts">
import { safeHref, type GrapesChrome } from '../../grapes/chrome'

defineProps<{
  host: HTMLElement
  chrome: GrapesChrome
  dataset: Record<string, string>
}>()
</script>

<template>
  <div v-if="chrome.pricingPlans?.length" class="zyad-pricing-plans">
    <div class="zyad-pricing-plans__grid">
      <div
        v-for="plan in chrome.pricingPlans"
        :key="plan.id"
        class="zyad-pricing-plans__card"
        :class="{ 'zyad-pricing-plans__card--featured': plan.isFeatured }"
      >
        <span v-if="plan.isFeatured" class="zyad-pricing-plans__badge">Populer</span>
        <p class="zyad-pricing-plans__name">{{ plan.name }}</p>
        <p class="zyad-pricing-plans__price">
          {{ plan.priceLabel }}
          <span v-if="plan.intervalLabel" class="zyad-pricing-plans__interval">{{
            ` ${plan.intervalLabel}`
          }}</span>
        </p>
        <p v-if="plan.description" class="zyad-pricing-plans__desc">{{ plan.description }}</p>
        <ul v-if="plan.features.length" class="zyad-pricing-plans__features">
          <template v-for="(feature, i) in plan.features" :key="i">
            <li v-if="feature">{{ feature }}</li>
          </template>
        </ul>
        <a
          v-if="plan.ctaLabel"
          class="zyad-pricing-plans__cta"
          :href="safeHref(plan.ctaUrl || '')"
          >{{ plan.ctaLabel }}</a
        >
      </div>
    </div>
  </div>
</template>
