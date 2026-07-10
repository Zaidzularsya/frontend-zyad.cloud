<script setup lang="ts">
defineProps<{
  content: {
    title: string
    description: string
    ctaText: string
    ctaUrl: string
    steps: Array<{
      number: number
      title: string
      desc: string
      highlight: boolean
    }>
  }
}>()
</script>

<template>
  <section id="cara-kerja" class="py-section-gap bg-primary-container text-on-primary">
    <div class="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-section-gap items-center">
        <div class="fade-up">
          <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg mb-6">
            {{ content.title }}
          </h2>
          <p class="font-body-lg text-on-primary-container mb-8">
            {{ content.description }}
          </p>
          <a
            :href="content.ctaUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center justify-center px-6 py-3 bg-secondary text-on-secondary font-label-sm text-label-sm rounded-lg hover:bg-secondary/90 transition-all hover:-translate-y-1 text-center shadow-md shadow-secondary/15"
          >
            {{ content.ctaText }}
          </a>
        </div>

        <div
          class="space-y-6 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-outline/50 before:to-transparent"
        >
          <div
            v-for="(step, idx) in content.steps"
            :key="idx"
            :class="`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group fade-up ${step.highlight ? 'is-active' : ''}`"
            :style="{ transitionDelay: `${idx * 150}ms` }"
          >
            <div
              :class="`flex items-center justify-center w-12 h-12 rounded-full border-4 border-primary-container shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${
                step.highlight
                  ? 'bg-secondary text-on-secondary shadow-secondary/50'
                  : 'bg-surface-tint text-on-primary'
              }`"
            >
              {{ step.number }}
            </div>

            <div
              :class="`w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-xl hover-lift ${
                step.highlight
                  ? 'bg-surface/10 backdrop-blur-md border border-white/10 glass-panel'
                  : 'bg-surface/5 border border-white/5'
              }`"
            >
              <h3 class="font-headline-md text-xl mb-2">
                {{ step.title }}
              </h3>
              <p class="font-body-md text-on-primary-container text-sm">
                {{ step.desc }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
