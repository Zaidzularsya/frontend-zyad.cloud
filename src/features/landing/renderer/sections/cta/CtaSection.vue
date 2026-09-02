<script setup lang="ts">
defineProps<{
  content: {
    title?: string
    description?: string
    primaryButtonText?: string
    secondaryButtonText?: string
    primaryUrl?: string
    secondaryUrl?: string
  }
}>()
</script>

<template>
  <section class="py-section-gap relative overflow-hidden bg-primary text-on-primary">
    <!-- Abstract Background -->
    <div
      class="absolute top-0 right-0 -mr-40 -mt-40 w-[600px] h-[600px] bg-secondary/30 rounded-full blur-3xl opacity-50 pointer-events-none"
    ></div>
    <div
      class="absolute bottom-0 left-0 -ml-40 -mb-40 w-[500px] h-[500px] bg-tertiary-fixed/20 rounded-full blur-3xl opacity-50 pointer-events-none"
    ></div>

    <div
      class="max-w-4xl mx-auto px-margin-mobile md:px-margin-desktop text-center relative z-10 fade-up"
    >
      <h2
        class="font-headline-lg text-headline-lg-mobile md:text-headline-lg mb-6"
        data-field="title"
      >
        {{ content.title || 'Ready to get started?' }}
      </h2>
      <p
        class="font-body-lg text-on-primary-container mb-10 max-w-2xl mx-auto"
        data-field="description"
      >
        {{ content.description }}
      </p>

      <div class="flex flex-col sm:flex-row justify-center gap-stack-md">
        <a
          :href="content.primaryUrl || '#contact'"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center justify-center px-8 py-4 bg-secondary text-on-secondary font-label-sm text-label-sm rounded-lg hover:bg-secondary/90 transition-all hover:-translate-y-1 shadow-lg shadow-secondary/20"
        >
          {{ content.primaryButtonText || 'Contact us' }}
        </a>
        <a
          :href="content.secondaryUrl || '#features'"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center justify-center px-8 py-4 bg-transparent border-2 border-outline-variant/30 text-on-primary font-label-sm text-label-sm rounded-lg hover:bg-white/10 transition-all hover:-translate-y-1"
        >
          {{ content.secondaryButtonText || 'Learn more' }}
        </a>
      </div>
    </div>
  </section>
</template>
