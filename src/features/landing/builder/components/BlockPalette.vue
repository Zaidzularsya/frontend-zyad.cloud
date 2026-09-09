<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

import { blocksByGroup } from '@/features/landing/shared/blocks/catalog'
import { HEADER_REGION_ID } from '@/features/landing/shared/canvas/bridge'

const emit = defineEmits<{
  insert: [blockId: string]
  blockpointerdown: [blockId: string, event: PointerEvent]
  selectchrome: [regionId: string]
}>()

// Tenant-wide chrome regions surfaced in the "navigation" group as non-draggable
// tiles — clicking selects the pinned canvas region instead of inserting a block.
const CHROME_TILES = [
  { id: HEADER_REGION_ID, icon: 'menu', label: 'Header' },
  { id: HEADER_REGION_ID, icon: 'palette', label: 'Brand' },
]

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

function onPointerDown(blockId: string, event: PointerEvent) {
  // Left button only; keep click-to-append working for a plain tap.
  if (event.button !== 0) return
  emit('blockpointerdown', blockId, event)
}
</script>

<template>
  <div class="space-y-2">
    <details
      v-for="group in groups"
      :key="group.group"
      class="group rounded-lg border border-gray-200 dark:border-gray-700"
      :open="isOpen(group.group)"
      @toggle="toggle(group.group, $event)"
    >
      <summary
        class="flex cursor-pointer select-none items-center justify-between px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500"
      >
        {{ group.label }}
        <ChevronDown class="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <div class="grid grid-cols-2 gap-1.5 border-t border-gray-100 p-2 dark:border-gray-800">
        <template v-if="group.group === 'navigation'">
          <button
            v-for="tile in CHROME_TILES"
            :key="tile.label"
            type="button"
            class="col-span-2 flex items-center gap-2 rounded-lg border border-dashed border-brand-300 bg-brand-50/50 p-2 text-left text-xs hover:border-brand-400 hover:bg-brand-50 dark:border-brand-800 dark:bg-brand-950/20"
            :data-chrome-tile="tile.label"
            @click="emit('selectchrome', tile.id)"
          >
            <span class="material-symbols-outlined text-base text-brand-600">{{ tile.icon }}</span>
            <span class="font-semibold leading-tight">{{ tile.label }}</span>
            <span class="ml-auto text-[10px] text-gray-400">semua halaman</span>
          </button>
        </template>
        <button
          v-for="block in group.blocks"
          :key="block.id"
          type="button"
          class="flex touch-none flex-col items-start gap-1 rounded-lg border border-gray-200 bg-white p-2 text-left text-xs hover:border-brand-400 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-900"
          :data-block-id="block.id"
          :title="block.description"
          @click="emit('insert', block.id)"
          @pointerdown="onPointerDown(block.id, $event)"
        >
          <span class="material-symbols-outlined text-base text-gray-500">{{ block.icon }}</span>
          <span class="font-semibold leading-tight">{{ block.label }}</span>
        </button>
      </div>
    </details>
  </div>
</template>
