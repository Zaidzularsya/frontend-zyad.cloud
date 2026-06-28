<script setup lang="ts">
defineProps<{
  content: {
    title?: string
    plans?: Array<{
      name: string
      priceLabel: string
      features?: string[]
    }>
  }
}>()
</script>

<template>
  <section id="pricing" class="bg-surface py-section-gap">
    <div class="mx-auto max-w-7xl px-margin-mobile md:px-margin-desktop">
      <div class="mx-auto mb-12 max-w-3xl text-center">
        <h2 class="font-headline-lg text-headline-lg-mobile text-primary md:text-headline-lg">
          {{ content.title || 'Choose the right package' }}
        </h2>
      </div>
      <div class="grid gap-5 md:grid-cols-3">
        <article
          v-for="plan in content.plans || []"
          :key="plan.name"
          class="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-8 shadow-sm transition hover:-translate-y-1 hover:border-secondary"
        >
          <h3 class="text-xl font-bold text-primary">{{ plan.name }}</h3>
          <p class="mt-3 text-3xl font-black text-secondary">{{ plan.priceLabel }}</p>
          <ul class="mt-6 space-y-3 text-sm text-on-surface-variant">
            <li v-for="feature in plan.features || []" :key="feature" class="flex gap-2">
              <span class="text-secondary">✓</span>
              <span>{{ feature }}</span>
            </li>
          </ul>
        </article>
      </div>
    </div>
  </section>
</template>
