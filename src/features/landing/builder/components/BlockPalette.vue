<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import Sortable from 'sortablejs'

import { blocksByGroup } from '@/features/landing/shared/blocks/catalog'

const emit = defineEmits<{
  insert: [blockId: string]
}>()

const groups = blocksByGroup()
const listRefs = ref<HTMLElement[]>([])
const sortables: Sortable[] = []

onMounted(() => {
  for (const element of listRefs.value) {
    sortables.push(
      Sortable.create(element, {
        group: { name: 'landing-blocks', pull: 'clone', put: false },
        sort: false,
        animation: 150,
        // The clone Sortable drops into the outline is removed there; this list
        // is a pure source.
      }),
    )
  }
})

onBeforeUnmount(() => {
  sortables.forEach((sortable) => sortable.destroy())
  sortables.length = 0
})
</script>

<template>
  <div class="space-y-4">
    <div v-for="group in groups" :key="group.group">
      <p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {{ group.label }}
      </p>
      <div ref="listRefs" class="grid grid-cols-2 gap-1.5">
        <button
          v-for="block in group.blocks"
          :key="block.id"
          type="button"
          class="flex flex-col items-start gap-1 rounded-lg border border-gray-200 bg-white p-2 text-left text-xs hover:border-brand-400 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-900"
          :data-block-id="block.id"
          :title="block.description"
          @click="emit('insert', block.id)"
        >
          <span class="material-symbols-outlined text-base text-gray-500">{{ block.icon }}</span>
          <span class="font-semibold leading-tight">{{ block.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
