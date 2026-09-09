<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import {
  onCanvasMessage,
  postToFrame,
  type CanvasOutboundMessage,
} from '@/features/landing/shared/canvas/bridge'
import { blockById } from '@/features/landing/shared/blocks/catalog'
import { useLandingBuilderStore } from '@/stores/landingBuilder'
import { useLandingChromeStore } from '@/stores/landingChrome'

const props = defineProps<{
  /** Target device width in px, or null for full width. */
  deviceWidth: number | null
}>()

const store = useLandingBuilderStore()
const { pageId, sections, selectedId } = storeToRefs(store)

const chromeStore = useLandingChromeStore()
const { canvasNav, canvasBranding } = storeToRefs(chromeStore)

function chromeMessage() {
  return {
    type: 'canvas:set-chrome' as const,
    header: { items: canvasNav.value },
    branding: canvasBranding.value,
  }
}

function pushChrome() {
  if (ready.value) postToFrame(frameWindow(), chromeMessage())
}

const frameRef = ref<HTMLIFrameElement | null>(null)
const frameHeight = ref(640)
const ready = ref(false)
let stopBridge: (() => void) | null = null

const src = computed(() => (pageId.value ? `/landing-canvas/${pageId.value}` : 'about:blank'))

function frameWindow(): Window | null {
  return frameRef.value?.contentWindow ?? null
}

function pushSections() {
  if (!ready.value) return
  postToFrame(frameWindow(), { type: 'canvas:set-sections', sections: sections.value })
}

function handle(message: CanvasOutboundMessage) {
  switch (message.type) {
    case 'canvas:ready':
      ready.value = true
      postToFrame(frameWindow(), { type: 'canvas:set-sections', sections: sections.value })
      postToFrame(frameWindow(), { type: 'canvas:set-selected', id: selectedId.value })
      postToFrame(frameWindow(), { type: 'canvas:set-device', width: props.deviceWidth })
      postToFrame(frameWindow(), chromeMessage())
      break
    case 'canvas:select':
      store.select(message.id)
      break
    case 'canvas:reorder':
      store.reorder(message.orderedIds)
      break
    case 'canvas:request-delete':
      store.removeBlock(message.id)
      break
    case 'canvas:request-insert':
      store.insertBlock(message.blockId, message.index)
      break
    case 'canvas:inline-edit':
      store.patchSection(message.id, {
        content: patchedContent(message.id, message.key, message.value),
      })
      break
    case 'canvas:size':
      frameHeight.value = Math.max(320, message.height)
      break
  }
}

function patchedContent(id: string, key: string, value: string) {
  const current = sections.value.find((section) => section.id === id)?.content ?? {}
  return { ...current, [key]: value }
}

function onFrameLoad() {
  // A fresh document — wait for its own canvas:ready before pushing state.
  ready.value = false
}

// ── Drag a palette block straight onto the canvas ───────────────────────────
// HTML5 drag events do not cross the iframe boundary reliably, so the drag is
// pointer-driven and hosted here: while dragging we disable the iframe's
// pointer-events (so this window keeps receiving pointermove/up even over it)
// and read the section rects directly from the same-origin canvas document.
const DRAG_THRESHOLD_PX = 4

const drag = ref<{
  blockId: string
  label: string
  active: boolean
  x: number
  y: number
} | null>(null)
const dropLine = ref<{ top: number; left: number; width: number } | null>(null)
let dragStart = { x: 0, y: 0 }
let dropIndex = 0

function frameRect(): DOMRect | null {
  return frameRef.value?.getBoundingClientRect() ?? null
}

function pointerInFrame(x: number, y: number): boolean {
  const r = frameRect()
  return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
}

function recomputeDrop(y: number) {
  const r = frameRect()
  const doc = frameRef.value?.contentDocument ?? null
  if (!r || !doc) {
    dropLine.value = null
    return
  }
  const shells = Array.from(doc.querySelectorAll<HTMLElement>('[data-section-id]'))
  if (shells.length === 0) {
    dropIndex = 0
    dropLine.value = { top: r.top + 8, left: r.left + 8, width: Math.max(0, r.width - 16) }
    return
  }
  for (let i = 0; i < shells.length; i += 1) {
    const sr = shells[i]!.getBoundingClientRect()
    if (y < r.top + sr.top + sr.height / 2) {
      dropIndex = i
      dropLine.value = { top: r.top + sr.top, left: r.left + sr.left, width: sr.width }
      return
    }
  }
  const last = shells[shells.length - 1]!.getBoundingClientRect()
  dropIndex = shells.length
  dropLine.value = { top: r.top + last.bottom, left: r.left + last.left, width: last.width }
}

function onPointerMove(event: PointerEvent) {
  if (!drag.value) return
  drag.value.x = event.clientX
  drag.value.y = event.clientY
  if (!drag.value.active) {
    const moved = Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y)
    if (moved < DRAG_THRESHOLD_PX) return
    drag.value.active = true
    if (frameRef.value) frameRef.value.style.pointerEvents = 'none'
  }
  if (pointerInFrame(event.clientX, event.clientY)) recomputeDrop(event.clientY)
  else dropLine.value = null
}

function onPointerUp(event: PointerEvent) {
  const current = drag.value
  endDrag()
  if (!current || !current.active) return
  if (pointerInFrame(event.clientX, event.clientY)) {
    store.insertBlock(current.blockId, dropIndex)
  }
}

function endDrag() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  if (frameRef.value) frameRef.value.style.pointerEvents = ''
  drag.value = null
  dropLine.value = null
}

/** Called by the palette on pointerdown over a block tile. */
function startBlockDrag(blockId: string, event: PointerEvent) {
  const block = blockById(blockId)
  if (!block) return
  dragStart = { x: event.clientX, y: event.clientY }
  drag.value = { blockId, label: block.label, active: false, x: event.clientX, y: event.clientY }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

defineExpose({ startBlockDrag })

onMounted(() => {
  stopBridge = onCanvasMessage<CanvasOutboundMessage>((message) => handle(message))
})

onBeforeUnmount(() => {
  stopBridge?.()
  endDrag()
})

watch(sections, () => pushSections(), { deep: true })
watch(selectedId, (id) => {
  if (ready.value) postToFrame(frameWindow(), { type: 'canvas:set-selected', id })
})
watch(
  () => props.deviceWidth,
  (width) => {
    if (ready.value) postToFrame(frameWindow(), { type: 'canvas:set-device', width })
  },
)
watch([canvasNav, canvasBranding], () => pushChrome(), { deep: true })
</script>

<template>
  <div class="relative h-full overflow-auto bg-gray-100 p-4 dark:bg-gray-950">
    <iframe
      ref="frameRef"
      :src="src"
      title="Canvas landing page"
      class="mx-auto block w-full rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800"
      :class="{ 'ring-2 ring-brand-400': drag?.active }"
      :style="{ height: `${frameHeight}px` }"
      @load="onFrameLoad"
    />

    <Teleport to="body">
      <div
        v-if="dropLine"
        class="pointer-events-none fixed z-[9998] h-0.5 rounded bg-brand-500"
        :style="{
          top: `${dropLine.top}px`,
          left: `${dropLine.left}px`,
          width: `${dropLine.width}px`,
        }"
      />
      <div
        v-if="drag?.active"
        class="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-1/2 rounded-md bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white shadow-lg"
        :style="{ top: `${drag.y}px`, left: `${drag.x}px` }"
      >
        {{ drag.label }}
      </div>
    </Teleport>
  </div>
</template>
