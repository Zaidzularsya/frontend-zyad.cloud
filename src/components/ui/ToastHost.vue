<script setup lang="ts">
import { CheckCircle2, CircleAlert, X } from 'lucide-vue-next'

import { useToast } from '@/components/ui/toast'

const { toasts, dismiss } = useToast()
</script>

<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6"
      role="status"
      aria-live="polite"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-white p-3 text-sm text-gray-800 shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
      >
        <CheckCircle2
          v-if="toast.tone === 'success'"
          class="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400"
          aria-hidden="true"
        />
        <CircleAlert
          v-else
          class="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400"
          aria-hidden="true"
        />
        <p class="flex-1">{{ toast.message }}</p>
        <button
          type="button"
          class="-m-1 rounded p-1 text-gray-400 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-brand-500 dark:hover:text-gray-200"
          aria-label="Tutup notifikasi"
          @click="dismiss(toast.id)"
        >
          <X class="size-4" />
        </button>
      </div>
    </div>
  </Teleport>
</template>
