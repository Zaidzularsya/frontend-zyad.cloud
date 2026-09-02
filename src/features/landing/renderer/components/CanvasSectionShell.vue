<script setup lang="ts">
import { GripVertical, Trash2 } from 'lucide-vue-next'
import type { LandingSection } from '../../shared/types/landing.types'

defineProps<{
  section: LandingSection
  selected: boolean
  label: string
}>()

const emit = defineEmits<{
  select: []
  remove: []
}>()
</script>

<template>
  <div
    class="canvas-section-shell"
    :class="{ 'is-selected': selected }"
    :data-section-id="section.id"
    @click="emit('select')"
  >
    <div class="canvas-section-toolbar" :class="{ 'is-visible': selected }" @click.stop>
      <button type="button" class="canvas-drag-handle" title="Geser untuk mengubah urutan">
        <GripVertical class="size-4" />
      </button>
      <span class="canvas-section-label">{{ label }}</span>
      <button
        type="button"
        class="canvas-section-remove"
        title="Hapus section"
        @click="emit('remove')"
      >
        <Trash2 class="size-4" />
      </button>
    </div>

    <span v-if="section.is_enabled === false" class="canvas-section-flag">Nonaktif</span>

    <div class="canvas-section-body" :class="{ 'is-disabled': section.is_enabled === false }">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.canvas-section-shell {
  position: relative;
  outline: 1px dashed transparent;
  outline-offset: -1px;
  transition: outline-color 0.12s ease;
}

.canvas-section-shell:hover {
  outline-color: rgba(59, 130, 246, 0.5);
}

.canvas-section-shell.is-selected {
  outline: 2px solid #3b82f6;
  outline-offset: -2px;
}

/* Section content is inert on the canvas: clicks select the shell, links/forms
   inside do not fire. Inline editing (later phase) re-enables specific nodes. */
.canvas-section-body {
  pointer-events: none;
}

.canvas-section-body.is-disabled {
  opacity: 0.45;
}

/* When a section is selected, its editable text nodes accept the cursor so
   they can be double-clicked into contentEditable. */
.canvas-section-shell.is-selected .canvas-section-body [data-field] {
  pointer-events: auto;
  cursor: text;
  outline: 1px dashed transparent;
  transition: outline-color 0.12s ease;
}

.canvas-section-shell.is-selected .canvas-section-body [data-field]:hover {
  outline-color: rgba(59, 130, 246, 0.6);
}

.canvas-section-body [data-field][contenteditable='true'] {
  outline: 2px solid #3b82f6;
  border-radius: 3px;
}

.canvas-section-toolbar {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px;
  border-radius: 8px;
  background: #1e293b;
  color: #fff;
  font-size: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  opacity: 0;
  transition: opacity 0.12s ease;
}

.canvas-section-shell:hover .canvas-section-toolbar,
.canvas-section-toolbar.is-visible {
  opacity: 1;
}

.canvas-drag-handle,
.canvas-section-remove {
  display: inline-flex;
  padding: 2px;
  border-radius: 5px;
  color: inherit;
}

.canvas-drag-handle {
  cursor: grab;
}

.canvas-drag-handle:active {
  cursor: grabbing;
}

.canvas-section-remove:hover {
  background: #ef4444;
}

.canvas-section-label {
  padding: 0 4px;
  font-weight: 600;
  white-space: nowrap;
}

.canvas-section-flag {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 30;
  padding: 2px 8px;
  border-radius: 999px;
  background: #64748b;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}
</style>
