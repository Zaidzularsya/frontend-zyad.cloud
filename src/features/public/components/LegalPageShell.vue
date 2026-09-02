<script setup lang="ts">
defineProps<{
  title: string
  updatedAt: string
  docVersion?: string
}>()
</script>

<template>
  <div class="mx-auto max-w-3xl px-6 py-16">
    <h1 class="font-display-sm mb-2 text-3xl font-semibold text-on-surface">{{ title }}</h1>
    <p class="mb-8 text-sm text-on-surface-variant">
      <span v-if="docVersion">Versi {{ docVersion }} · </span>Terakhir diperbarui: {{ updatedAt }}
    </p>

    <div
      class="legal-content space-y-6 text-sm leading-relaxed text-on-surface-variant [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-on-surface [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6 [&_strong]:text-on-surface"
    >
      <slot />
    </div>
  </div>
</template>
