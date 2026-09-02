<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Sortable from 'sortablejs'
import { GripVertical, Trash2 } from 'lucide-vue-next'

import { resolveBlockForSection } from '@/features/landing/shared/blocks/catalog'
import type { LandingSection } from '@/features/landing/shared/types/landing.types'

const props = defineProps<{
  sections: LandingSection[]
  selectedId: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
  remove: [id: string]
  reorder: [orderedIds: string[]]
  insert: [blockId: string, index: number]
}>()

const listRef = ref<HTMLElement | null>(null)
let sortable: Sortable | null = null

function labelFor(section: LandingSection): string {
  return resolveBlockForSection(section)?.label || section.name || String(section.type)
}

function setup() {
  if (!listRef.value || sortable) return
  sortable = Sortable.create(listRef.value, {
    group: { name: 'landing-blocks', put: true },
    handle: '.outline-handle',
    animation: 150,
    onAdd: (evt) => {
      const blockId = (evt.item as HTMLElement).dataset.blockId
      const index = evt.newIndex ?? props.sections.length
      evt.item.remove() // drop the cloned palette node; Vue owns this list
      if (blockId) emit('insert', blockId, index)
    },
    onUpdate: (evt) => {
      const { oldIndex, newIndex, item, from } = evt
      if (oldIndex == null || newIndex == null || oldIndex === newIndex) return
      item.remove()
      from.insertBefore(item, from.children[oldIndex] ?? null)
      const ids = props.sections.map((section) => section.id)
      const [moved] = ids.splice(oldIndex, 1)
      if (moved !== undefined) ids.splice(newIndex, 0, moved)
      emit('reorder', ids)
    },
  })
}

watch(
  () => props.sections.length,
  async () => {
    await nextTick()
    setup()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  sortable?.destroy()
  sortable = null
})
</script>

<template>
  <div>
    <p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
      Struktur halaman
    </p>
    <ul ref="listRef" class="space-y-1">
      <li
        v-for="section in sections"
        :key="section.id"
        class="group flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm"
        :class="
          section.id === selectedId
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
            : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900'
        "
        :data-section-id="section.id"
        @click="emit('select', section.id)"
      >
        <span class="outline-handle cursor-grab text-gray-400" @click.stop>
          <GripVertical class="size-4" />
        </span>
        <span class="min-w-0 flex-1 truncate">
          {{ labelFor(section) }}
          <span v-if="section.is_enabled === false" class="text-xs text-gray-400">· nonaktif</span>
        </span>
        <button
          type="button"
          class="opacity-0 transition group-hover:opacity-100"
          title="Hapus section"
          @click.stop="emit('remove', section.id)"
        >
          <Trash2 class="size-4 text-gray-400 hover:text-red-500" />
        </button>
      </li>
      <li
        v-if="sections.length === 0"
        class="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-gray-400"
      >
        Klik atau tarik blok dari atas
      </li>
    </ul>
  </div>
</template>
