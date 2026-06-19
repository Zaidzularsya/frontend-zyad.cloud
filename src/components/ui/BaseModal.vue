<script setup lang="ts">
import { X } from 'lucide-vue-next'

defineProps<{
  open: boolean
  title: string
}>()

defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        class="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
        @click="$emit('close')"
      ></div>

      <div class="relative w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-gray-900">
        <div class="flex items-center justify-between border-b p-5 dark:border-gray-800">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ title }}</h3>
          <button
            class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-800"
            @click="$emit('close')"
          >
            <X class="size-5" />
          </button>
        </div>

        <div class="p-5">
          <slot></slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>
