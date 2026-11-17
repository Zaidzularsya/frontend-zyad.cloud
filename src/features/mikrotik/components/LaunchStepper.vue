<script setup lang="ts">
import { computed } from 'vue'

import type { IsolationMode } from '@/features/mikrotik/types'

const props = defineProps<{ mode: IsolationMode }>()

const STEPS = [
  { key: 'simulation', label: 'Simulasi' },
  { key: 'pilot', label: 'Pilot' },
  { key: 'active', label: 'Aktif' },
] as const

// 'paused' hanya bisa dicapai setelah aktif, jadi langkahnya sama dengan Aktif.
const currentIndex = computed(() => {
  if (props.mode === 'simulation') return 0
  if (props.mode === 'pilot') return 1
  return 2
})
</script>

<template>
  <ol class="grid gap-2 sm:grid-cols-3" aria-label="Langkah peluncuran">
    <li
      v-for="(step, i) in STEPS"
      :key="step.key"
      class="flex items-center gap-3 rounded-xl border p-3"
      :class="i === currentIndex ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30' : ''"
      :aria-current="i === currentIndex ? 'step' : undefined"
      :data-state="i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'todo'"
    >
      <span
        class="flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold"
        aria-hidden="true"
        >{{ i < currentIndex ? '✓' : i + 1 }}</span
      >
      <span class="text-sm font-medium">
        {{ step.label }}
        <span v-if="i < currentIndex" class="sr-only">(selesai)</span>
      </span>
    </li>
  </ol>
</template>
