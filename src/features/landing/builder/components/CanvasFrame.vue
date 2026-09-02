<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import {
  onCanvasMessage,
  postToFrame,
  type CanvasOutboundMessage,
} from '@/features/landing/shared/canvas/bridge'
import { useLandingBuilderStore } from '@/stores/landingBuilder'

const props = defineProps<{
  /** Target device width in px, or null for full width. */
  deviceWidth: number | null
}>()

const store = useLandingBuilderStore()
const { pageId, sections, selectedId } = storeToRefs(store)

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

onMounted(() => {
  stopBridge = onCanvasMessage<CanvasOutboundMessage>((message) => handle(message))
})

onBeforeUnmount(() => {
  stopBridge?.()
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
</script>

<template>
  <div class="h-full overflow-auto bg-gray-100 p-4 dark:bg-gray-950">
    <iframe
      ref="frameRef"
      :src="src"
      title="Canvas landing page"
      class="mx-auto block w-full rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800"
      :style="{ height: `${frameHeight}px` }"
      @load="onFrameLoad"
    />
  </div>
</template>
