<script setup lang="ts">
defineProps<{
  content: {
    items?: Array<{
      label: string
      value: string
      description?: string
    }>
  }
}>()
</script>

<template>
  <section class="bg-primary py-section-gap text-on-primary">
    <div class="mx-auto grid max-w-7xl gap-4 px-margin-mobile md:grid-cols-3 md:px-margin-desktop">
      <article
        v-for="item in content.items || []"
        :key="item.label"
        class="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur"
      >
        <strong class="block text-4xl font-black text-secondary">{{ item.value }}</strong>
        <span class="mt-3 block text-sm font-bold uppercase tracking-wide text-on-primary">
          {{ item.label }}
        </span>
        <p class="mt-3 text-sm leading-6 text-on-primary-container">
          {{ item.description }}
        </p>
      </article>
    </div>
  </section>
</template>
