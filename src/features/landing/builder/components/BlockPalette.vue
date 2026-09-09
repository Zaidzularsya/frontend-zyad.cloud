<script setup lang="ts">
import { ref } from 'vue'
import { ChevronRight } from 'lucide-vue-next'

import { blocksByGroup } from '@/features/landing/shared/blocks/catalog'

const props = defineProps<{
  /** Page already has a header section — disable the Header tile to avoid duplicates. */
  hasHeader?: boolean
}>()

const emit = defineEmits<{
  insert: [blockId: string]
  blockpointerdown: [blockId: string, event: PointerEvent]
}>()

const groups = blocksByGroup()

// Element groups open by default; larger section groups collapsed to keep the
// palette scannable. Persisted per browser.
const OPEN_BY_DEFAULT = new Set(['layout', 'text', 'media', 'interactive'])
const STORAGE_KEY = 'landing-builder:palette-open'

function loadOpen(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Record<string, boolean>
  } catch {
    /* ignore */
  }
  return {}
}

const openState = ref<Record<string, boolean>>(loadOpen())

function isOpen(group: string): boolean {
  return openState.value[group] ?? OPEN_BY_DEFAULT.has(group)
}

function toggle(group: string, event: Event) {
  openState.value = { ...openState.value, [group]: (event.target as HTMLDetailsElement).open }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(openState.value))
  } catch {
    /* ignore */
  }
}

function isDisabled(blockId: string): boolean {
  return blockId === 'header.default' && Boolean(props.hasHeader)
}

function onPointerDown(blockId: string, event: PointerEvent) {
  // Left button only; keep click-to-append working for a plain tap.
  if (event.button !== 0 || isDisabled(blockId)) return
  emit('blockpointerdown', blockId, event)
}
</script>

<template>
  <div class="divide-y divide-gray-100 dark:divide-gray-800">
    <details
      v-for="group in groups"
      :key="group.group"
      class="group py-1"
      :open="isOpen(group.group)"
      @toggle="toggle(group.group, $event)"
    >
      <summary
        class="flex cursor-pointer select-none items-center gap-1 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400"
      >
        <ChevronRight class="size-3.5 transition-transform group-open:rotate-90" />
        {{ group.label }}
      </summary>
      <div class="grid grid-cols-2 gap-1 pb-1.5 pl-4">
        <button
          v-for="block in group.blocks"
          :key="block.id"
          type="button"
          class="flex touch-none flex-col items-start gap-0.5 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-left text-xs hover:border-brand-400 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900"
          :data-block-id="block.id"
          :title="isDisabled(block.id) ? 'Halaman ini sudah punya Header' : block.description"
          :disabled="isDisabled(block.id)"
          @click="!isDisabled(block.id) && emit('insert', block.id)"
          @pointerdown="onPointerDown(block.id, $event)"
        >
          <span class="material-symbols-outlined text-base text-gray-500">{{ block.icon }}</span>
          <span class="font-semibold leading-tight">{{ block.label }}</span>
        </button>
      </div>
    </details>
  </div>
</template>
