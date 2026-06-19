<script setup lang="ts">
defineProps<{
  content: {
    title: string
    description: string
    services: Array<{
      icon: string
      title: string
      desc: string
    }>
  }
}>()
</script>

<template>
  <section id="solusi" class="py-section-gap bg-surface">
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
          v-for="(service, idx) in content.services"
          :key="idx"
          class="group bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/30 hover:border-secondary transition-colors hover-lift fade-up visible"
          :style="{ transitionDelay: `${idx * 100}ms` }"
        >
          <div
            class="w-14 h-14 rounded-xl bg-primary-fixed/30 text-secondary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
          >
            <span class="material-symbols-outlined text-3xl">
              {{ service.icon }}
            </span>
          </div>
          <h3 class="font-headline-md text-xl text-on-surface mb-3">
            {{ service.title }}
          </h3>
          <p class="font-body-md text-on-surface-variant text-sm">
            {{ service.desc }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
