<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

import GrapesPageRenderer from '@/features/landing/renderer/components/GrapesPageRenderer.vue'
import type { GrapesChrome } from '@/features/landing/renderer/grapes/chrome'
import { PAGE_TEMPLATE_CATEGORIES } from '@/features/landing/shared/page-template-categories'
import type {
  PageTemplateDetail,
  PageTemplateSummary,
} from '@/features/landing/shared/types/page-template.types'
import type { createRenderQueue } from './gallery-logic'

const STAGE_WIDTH = 1280
const DEFAULT_SCALE = 0.25
const SCROLL_DURATION = '6s'
const RETURN_DURATION = '0.6s'

const props = defineProps<{
  template: PageTemplateSummary
  chrome: GrapesChrome
  queue: ReturnType<typeof createRenderQueue>
  loadDetail: (id: string) => Promise<PageTemplateDetail>
  /** Hanya thumbnail (tabel kelola): tanpa teks, lebar mengikuti pembungkus. */
  compact?: boolean
}>()

const emit = defineEmits<{ open: [template: PageTemplateSummary] }>()

const cardEl = useTemplateRef<HTMLElement>('cardEl')
const thumbEl = useTemplateRef<HTMLElement>('thumbEl')
const stageEl = useTemplateRef<HTMLElement>('stageEl')

const detail = ref<PageTemplateDetail | null>(null)
const failed = ref(false)
const hovering = ref(false)
const scale = ref(DEFAULT_SCALE)
const maxShift = ref(0)
let loading = false

const categoryLabel = computed(
  () => PAGE_TEMPLATE_CATEGORIES.find((c) => c.code === props.template.category)?.label ?? '',
)

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

const stageStyle = computed(() => {
  const shift = hovering.value && !prefersReducedMotion() ? maxShift.value : 0
  return {
    width: `${STAGE_WIDTH}px`,
    transform: `translateY(-${shift}px) scale(${scale.value})`,
    transitionDuration: hovering.value ? SCROLL_DURATION : RETURN_DURATION,
  }
})

function measure() {
  const thumb = thumbEl.value
  const stage = stageEl.value
  if (!thumb) return
  const width = thumb.clientWidth
  if (width > 0) scale.value = width / STAGE_WIDTH
  if (stage && thumb.clientHeight > 0) {
    maxShift.value = Math.max(0, stage.offsetHeight * scale.value - thumb.clientHeight)
  }
}

async function ensureDetail() {
  if (detail.value || loading) return
  loading = true
  failed.value = false
  const release = await props.queue.acquire()
  try {
    detail.value = await props.loadDetail(props.template.id)
    await nextTick()
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    measure()
  } catch {
    failed.value = true
  } finally {
    release()
    loading = false
  }
}

let intersection: IntersectionObserver | null = null
let resize: ResizeObserver | null = null

onMounted(() => {
  if (typeof IntersectionObserver === 'function' && cardEl.value) {
    intersection = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        intersection?.disconnect()
        void ensureDetail()
      }
    })
    intersection.observe(cardEl.value)
  } else {
    void ensureDetail()
  }
  if (typeof ResizeObserver === 'function') {
    resize = new ResizeObserver(measure)
    if (thumbEl.value) resize.observe(thumbEl.value)
    if (stageEl.value) resize.observe(stageEl.value)
  }
})

onBeforeUnmount(() => {
  intersection?.disconnect()
  resize?.disconnect()
})

function open() {
  if (failed.value) void ensureDetail()
  emit('open', props.template)
}
</script>

<template>
  <div
    ref="cardEl"
    role="button"
    tabindex="0"
    class="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm transition hover:border-gray-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-gray-800 dark:bg-gray-900"
    :class="{ 'w-40': compact }"
    :aria-label="`Lihat template ${template.name}`"
    @click="open"
    @keydown.enter.prevent="open"
    @keydown.space.prevent="open"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
    @focus="hovering = true"
    @blur="hovering = false"
  >
    <div
      ref="thumbEl"
      class="relative aspect-[4/3] w-full overflow-hidden border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800"
    >
      <div
        v-if="detail"
        ref="stageEl"
        class="pointer-events-none absolute top-0 left-0 origin-top-left transition-transform ease-in-out"
        :style="stageStyle"
        inert
        aria-hidden="true"
      >
        <GrapesPageRenderer
          :html="detail.html"
          :css="detail.css"
          :chrome="chrome"
          :title="template.name"
          static
        />
      </div>
      <div
        v-else
        class="flex h-full items-center justify-center p-4 text-center text-sm font-medium text-gray-500"
      >
        {{ failed ? template.name : '' }}
      </div>
    </div>
    <div v-if="!compact" class="flex flex-1 flex-col gap-1 p-4">
      <p class="text-xs font-medium tracking-wide text-gray-500">{{ categoryLabel }}</p>
      <h4 class="font-semibold text-gray-900 dark:text-gray-100">{{ template.name }}</h4>
      <p class="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
        {{ template.description }}
      </p>
    </div>
  </div>
</template>
