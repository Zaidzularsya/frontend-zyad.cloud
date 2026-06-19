<script setup lang="ts">
defineProps<{
  content: {
    title: string
    description: string
    benefits: Array<{
      icon: string
      title: string
      desc: string
    }>
  }
}>()
</script>

<template>
  <section id="benefits" class="py-section-gap bg-surface-container-lowest">
    <div class="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop">
      <div class="text-center max-w-3xl mx-auto mb-16 fade-up visible">
        <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-6">
          {{ content.title }}
        </h2>
        <p class="font-body-lg text-body-lg text-on-surface-variant">
          {{ content.description }}
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
        <div
          v-for="(benefit, idx) in content.benefits"
          :key="idx"
          class="bg-surface rounded-xl p-8 border border-outline-variant/20 hover-lift fade-up visible"
          :style="{ transitionDelay: `${idx * 100}ms` }"
        >
          <div
            class="w-12 h-12 rounded-lg bg-secondary-fixed/50 flex items-center justify-center mb-6"
          >
            <span class="material-symbols-outlined text-on-secondary-fixed-variant">
              {{ benefit.icon }}
            </span>
          </div>
          <h3 class="font-headline-md text-xl mb-3 text-on-surface">
            {{ benefit.title }}
          </h3>
          <p class="font-body-md text-on-surface-variant text-sm">
            {{ benefit.desc }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
