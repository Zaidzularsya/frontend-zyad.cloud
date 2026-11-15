<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

import BaseCard from '@/components/ui/BaseCard.vue'
import { useControlQuery } from '@/features/mikrotik/api/mikrotik.queries'
import type { IsolationMode } from '@/features/mikrotik/types'

// Mode isolir berlaku untuk seluruh organisasi; pengaturannya ada di menu Isolir.
// Induk hanya merender kartu ini untuk pemegang mikrotik_control.read.
const query = useControlQuery(ref(true))
const mode = computed(() => query.data.value?.mode)

const MODES: Record<IsolationMode, { label: string; hint: string; cls: string; dot: string }> = {
  simulation: {
    label: 'Simulasi',
    hint: 'Belum ada pelanggan yang diisolir; sistem hanya menghitung siapa yang akan terkena.',
    cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    dot: 'bg-gray-400',
  },
  pilot: {
    label: 'Pilot',
    hint: 'Isolir hanya berjalan untuk pelanggan pilot.',
    cls: 'bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200',
    dot: 'bg-brand-500',
  },
  active: {
    label: 'Aktif',
    hint: 'Pelanggan yang lewat toleransi jatuh tempo diisolir otomatis.',
    cls: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
    dot: 'bg-green-500',
  },
  paused: {
    label: 'Dijeda',
    hint: 'Isolir otomatis berhenti sementara; tidak ada isolir baru.',
    cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
    dot: 'bg-amber-500',
  },
}
const view = computed(() => (mode.value ? MODES[mode.value] : undefined))
</script>

<template>
  <BaseCard data-card="isolation">
    <div class="flex items-start justify-between gap-2">
      <h3 class="font-semibold">Status isolir</h3>
      <span
        v-if="view"
        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
        :class="view.cls"
      >
        <span class="h-1.5 w-1.5 rounded-full" :class="view.dot" aria-hidden="true" />
        {{ view.label }}
      </span>
    </div>
    <p v-if="query.isLoading.value" class="mt-3 text-sm text-gray-500">Memuat...</p>
    <p v-else-if="query.isError.value" class="mt-3 text-sm text-red-600" role="alert">
      Gagal memuat status isolir.
    </p>
    <p v-else-if="view" class="mt-3 text-sm text-gray-600 dark:text-gray-300">{{ view.hint }}</p>
    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Berlaku untuk semua router.</p>
    <RouterLink
      :to="{ name: 'mikrotik-isolation' }"
      class="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-brand-400"
      >Buka Isolir</RouterLink
    >
  </BaseCard>
</template>
