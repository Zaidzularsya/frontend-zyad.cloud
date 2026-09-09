<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Sortable from 'sortablejs'
import DOMPurify from 'dompurify'

import { landingApi } from '@/features/landing/shared/api/landing.api'
import { resolveBlockForSection } from '@/features/landing/shared/blocks/catalog'
import {
  onCanvasMessage,
  postToParent,
  type CanvasInboundMessage,
} from '@/features/landing/shared/canvas/bridge'
import type { LandingPage, LandingSection } from '../../shared/types/landing.types'
import { provideEditMode } from '../composables/useEditMode'
import SectionRenderer from '../components/SectionRenderer.vue'
import CanvasSectionShell from '../components/CanvasSectionShell.vue'

const route = useRoute()
const pageId = computed(() => String(route.params.pageId || ''))

provideEditMode(true)

const page = ref<LandingPage | null>(null)
const sections = ref<LandingSection[]>([])
const selectedId = ref<string | null>(null)
const deviceWidth = ref<number | null>(null)
const loading = ref(true)
const errorMessage = ref('')

const listRef = ref<HTMLElement | null>(null)
const dragBlockId = ref<string | null>(null)
const dropIndex = ref<number | null>(null)
let sortable: Sortable | null = null
let resizeObserver: ResizeObserver | null = null
let stopBridge: (() => void) | null = null

const orderedSections = computed(() =>
  [...sections.value].sort((a, b) => {
    const orderA = a.sort_order ?? a.sortOrder ?? 0
    const orderB = b.sort_order ?? b.sortOrder ?? 0
    return orderA - orderB
  }),
)

const canvasStyle = computed(() => ({
  maxWidth: deviceWidth.value ? `${deviceWidth.value}px` : '100%',
}))

function labelFor(section: LandingSection): string {
  return resolveBlockForSection(section)?.label || section.name || String(section.type)
}

function arrayMove<T>(items: T[], from: number, to: number): T[] {
  const copy = items.slice()
  const [moved] = copy.splice(from, 1)
  if (moved !== undefined) copy.splice(to, 0, moved)
  return copy
}

function select(id: string | null) {
  selectedId.value = id
  postToParent({ type: 'canvas:select', id })
}

function removeSection(id: string) {
  sections.value = sections.value.filter((section) => section.id !== id)
  if (selectedId.value === id) selectedId.value = null
  postToParent({ type: 'canvas:request-delete', id })
}

function reportSize() {
  const height = document.documentElement.scrollHeight
  postToParent({ type: 'canvas:size', height })
}

function handleInbound(message: CanvasInboundMessage) {
  switch (message.type) {
    case 'canvas:set-sections':
      sections.value = message.sections
      break
    case 'canvas:set-selected':
      selectedId.value = message.id
      break
    case 'canvas:set-device':
      deviceWidth.value = message.width
      break
    case 'canvas:drag':
      dragBlockId.value = message.blockId
      if (!message.blockId) dropIndex.value = null
      break
  }
}

// ── Drag a palette block onto the canvas ────────────────────────────────────
function computeDropIndex(clientY: number): number {
  const children = Array.from(listRef.value?.children ?? []).filter(
    (el): el is HTMLElement => el instanceof HTMLElement && el.dataset.sectionId !== undefined,
  )
  for (let i = 0; i < children.length; i += 1) {
    const rect = children[i]!.getBoundingClientRect()
    if (clientY < rect.top + rect.height / 2) return i
  }
  return children.length
}

function onCanvasDragOver(event: DragEvent) {
  if (!dragBlockId.value) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  dropIndex.value = computeDropIndex(event.clientY)
}

function onCanvasDrop(event: DragEvent) {
  if (!dragBlockId.value) return
  event.preventDefault()
  const index = dropIndex.value ?? computeDropIndex(event.clientY)
  postToParent({ type: 'canvas:request-insert', blockId: dragBlockId.value, index })
  dragBlockId.value = null
  dropIndex.value = null
}

function onCanvasDragLeave(event: DragEvent) {
  const related = event.relatedTarget as Node | null
  if (!related || !listRef.value?.contains(related)) dropIndex.value = null
}

function setupSortable() {
  if (!listRef.value || sortable) return
  sortable = Sortable.create(listRef.value, {
    handle: '.canvas-drag-handle',
    animation: 150,
    onEnd: (evt) => {
      const { oldIndex, newIndex, item, from } = evt
      if (oldIndex == null || newIndex == null || oldIndex === newIndex) return
      // Revert Sortable's DOM mutation so Vue stays the single source of truth.
      item.remove()
      from.insertBefore(item, from.children[oldIndex] ?? null)

      const reordered = arrayMove(orderedSections.value, oldIndex, newIndex).map(
        (section, index) => ({
          ...section,
          sort_order: (index + 1) * 10,
        }),
      )
      sections.value = reordered
      postToParent({ type: 'canvas:reorder', orderedIds: reordered.map((section) => section.id) })
    },
  })
}

// ── Inline text editing ─────────────────────────────────────────────────────
const RICH_TAGS = ['b', 'i', 'em', 'strong', 'u', 'br', 'span', 'a']
let editing: { el: HTMLElement; id: string; key: string; original: string } | null = null

function isRichKey(key: string): boolean {
  return key === 'titleHtml' || key.endsWith('Html')
}

function readValue(el: HTMLElement, key: string): string {
  return isRichKey(key)
    ? DOMPurify.sanitize(el.innerHTML, { ALLOWED_TAGS: RICH_TAGS, ALLOWED_ATTR: ['href'] })
    : (el.innerText ?? '').trim()
}

function stopEditing(commit: boolean) {
  if (!editing) return
  const { el, id, key, original } = editing
  el.removeEventListener('blur', onEditBlur)
  el.removeEventListener('keydown', onEditKeydown)
  el.contentEditable = 'false'
  const value = readValue(el, key)
  editing = null
  if (commit && value !== original) {
    postToParent({ type: 'canvas:inline-edit', id, key, value })
  } else if (!commit) {
    el.innerHTML = original
  }
}

function onEditBlur() {
  stopEditing(true)
}

function onEditKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    ;(event.target as HTMLElement).blur()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    stopEditing(false)
    ;(event.target as HTMLElement).blur()
  }
}

function onCanvasDblClick(event: MouseEvent) {
  const fieldEl = (event.target as HTMLElement).closest<HTMLElement>('[data-field]')
  if (!fieldEl) return
  const shell = fieldEl.closest<HTMLElement>('[data-section-id]')
  const id = shell?.dataset.sectionId
  const key = fieldEl.dataset.field
  if (!id || !key || id !== selectedId.value) return

  stopEditing(true)
  editing = { el: fieldEl, id, key, original: fieldEl.innerHTML }
  fieldEl.contentEditable = 'true'
  fieldEl.addEventListener('blur', onEditBlur)
  fieldEl.addEventListener('keydown', onEditKeydown)
  fieldEl.focus()
  const range = document.createRange()
  range.selectNodeContents(fieldEl)
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
}

onMounted(async () => {
  stopBridge = onCanvasMessage<CanvasInboundMessage>((message) => handleInbound(message))
  document.addEventListener('dblclick', onCanvasDblClick)

  try {
    const [pageResponse, sectionResponse] = await Promise.all([
      landingApi.getPage(pageId.value),
      landingApi.getSections(pageId.value),
    ])
    page.value = pageResponse.data
    sections.value = sectionResponse.data
  } catch (error) {
    console.error('LandingCanvasFramePage: failed to load page', error)
    errorMessage.value = 'Canvas gagal dimuat.'
  } finally {
    loading.value = false
  }

  await nextTick()
  setupSortable()

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => reportSize())
    resizeObserver.observe(document.documentElement)
  }
  reportSize()
  postToParent({ type: 'canvas:ready' })
})

watch(orderedSections, async () => {
  await nextTick()
  setupSortable()
  reportSize()
})

onBeforeUnmount(() => {
  stopBridge?.()
  document.removeEventListener('dblclick', onCanvasDblClick)
  stopEditing(false)
  sortable?.destroy()
  sortable = null
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<template>
  <div class="canvas-root" @click="select(null)">
    <div v-if="loading" class="canvas-state">Memuat canvas…</div>
    <div v-else-if="errorMessage" class="canvas-state">{{ errorMessage }}</div>

    <div
      v-else
      class="canvas-frame"
      :class="{ 'is-drop-target': Boolean(dragBlockId) }"
      :style="canvasStyle"
      @dragover="onCanvasDragOver"
      @drop="onCanvasDrop"
      @dragleave="onCanvasDragLeave"
    >
      <div v-if="orderedSections.length === 0" class="canvas-empty">
        <span v-if="dragBlockId">Lepas di sini untuk menambahkan blok</span>
        <span v-else>Belum ada blok. Tarik blok dari panel kiri untuk memulai.</span>
      </div>

      <div ref="listRef">
        <template v-for="(section, i) in orderedSections" :key="section.id">
          <div v-if="dropIndex === i" class="canvas-drop-line"></div>
          <CanvasSectionShell
            :section="section"
            :selected="section.id === selectedId"
            :label="labelFor(section)"
            @click.stop
            @select="select(section.id)"
            @remove="removeSection(section.id)"
          >
            <SectionRenderer :section="section" />
          </CanvasSectionShell>
        </template>
        <div
          v-if="dropIndex === orderedSections.length && orderedSections.length > 0"
          class="canvas-drop-line"
        ></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.canvas-root {
  min-height: 100vh;
  background: #ffffff;
}

.canvas-frame {
  margin: 0 auto;
  transition: max-width 0.2s ease;
}

.canvas-frame.is-drop-target {
  outline: 2px dashed #3b82f6;
  outline-offset: -2px;
}

.canvas-drop-line {
  height: 3px;
  margin: 2px 0;
  border-radius: 2px;
  background: #3b82f6;
}

.canvas-state,
.canvas-empty {
  padding: 48px 24px;
  text-align: center;
  color: #64748b;
  font-size: 14px;
}
</style>
