<script setup lang="ts">
defineProps<{
  title: string
  updatedAt: string
}>()
</script>

<template>
  <div class="mx-auto max-w-3xl px-6 py-16">
    <h1 class="font-display-sm mb-2 text-3xl font-semibold text-on-surface">{{ title }}</h1>
    <p class="mb-8 text-sm text-on-surface-variant">Terakhir diperbarui: {{ updatedAt }}</p>

    <div
      class="mb-8 rounded-xl border border-amber-400/40 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
    >
      Dokumen ini adalah templat. Bagian bertanda
      <strong>[ISI SESUAI DATA BISNIS ANDA]</strong> wajib dilengkapi dengan data badan usaha yang
      sebenarnya sebelum digunakan secara resmi.
    </div>

    <div
      class="legal-content space-y-6 text-sm leading-relaxed text-on-surface-variant [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-on-surface [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6 [&_strong]:text-on-surface"
    >
      <slot />
    </div>
  </div>
</template>
