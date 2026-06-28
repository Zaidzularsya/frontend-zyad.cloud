<script setup lang="ts">
defineProps<{
  content: {
    title?: string
    logos?: string[]
  }
}>()
</script>

<template>
  <section class="border-y border-outline-variant/30 bg-surface py-10">
    <div class="mx-auto max-w-7xl px-margin-mobile md:px-margin-desktop">
      <p class="text-center text-sm font-semibold text-on-surface-variant">
        {{ content.title || 'Trusted by growing teams' }}
      </p>
      <div class="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div
          v-for="logo in content.logos || []"
          :key="logo"
          class="rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-4 text-center text-sm font-bold text-primary shadow-sm"
        >
          {{ logo }}
        </div>
      </div>
    </div>
  </section>
</template>
