<script setup lang="ts">
import { Check, MessageSquareWarning } from 'lucide-vue-next'

defineEmits<{
  (e: 'approve'): void
  (e: 'revise'): void
}>()
</script>

<template>
  <div
    class="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:inset-x-auto sm:right-6 sm:bottom-6 sm:rounded-xl sm:border sm:shadow-lg dark:border-gray-800 dark:bg-gray-900/95"
  >
    <div class="mx-auto flex max-w-3xl gap-3 sm:max-w-none">
      <button
        type="button"
        class="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:ring-4 focus:ring-gray-100 focus:outline-none sm:flex-none dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        @click="$emit('revise')"
      >
        <MessageSquareWarning class="size-4" aria-hidden="true" />
        Minta revisi
      </button>
      <button
        type="button"
        class="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-100 focus:outline-none sm:flex-none"
        @click="$emit('approve')"
      >
        <Check class="size-4" aria-hidden="true" />
        Setujui
      </button>
    </div>
  </div>
</template>
