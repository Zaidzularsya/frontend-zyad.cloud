<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Monitor, Redo2, RefreshCw, Rocket, Smartphone, Tablet, Undo2 } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import LandingPagePicker from '@/features/landing/builder/components/LandingPagePicker.vue'
import BlockPalette from '@/features/landing/builder/components/BlockPalette.vue'
import CanvasFrame from '@/features/landing/builder/components/CanvasFrame.vue'
import SectionPropertyPanel from '@/features/landing/builder/components/SectionPropertyPanel.vue'
import HeaderBrandPanel from '@/features/landing/builder/components/HeaderBrandPanel.vue'
import { usePageSelection } from '@/features/landing/builder/composables/usePageSelection'
import { useLandingBuilderStore } from '@/stores/landingBuilder'
import { useLandingChromeStore } from '@/stores/landingChrome'
import { HEADER_REGION_ID } from '@/features/landing/shared/canvas/bridge'

defineProps<{
  title?: string
  description?: string
  mode?: 'workspace' | 'platform'
  parentRouteName?: string
}>()

const route = useRoute()
const { pages, selectedPageId, loadPages } = usePageSelection()
const store = useLandingBuilderStore()
const {
  sections,
  selectedId,
  selectedSection,
  dirty,
  saving,
  canUndo,
  canRedo,
  loading,
  loadError,
  saveError,
  lastSavedAt,
} = storeToRefs(store)

const chromeStore = useLandingChromeStore()
const headerSelected = computed(() => selectedId.value === HEADER_REGION_ID)

const deviceWidth = ref<number | null>(null)
const canvasFrameRef = ref<InstanceType<typeof CanvasFrame> | null>(null)

const savedLabel = computed(() => {
  if (saving.value) return 'Menyimpan…'
  if (dirty.value) return 'Belum tersimpan'
  if (lastSavedAt.value) {
    return `Tersimpan ${new Date(lastSavedAt.value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
  }
  return 'Tersimpan'
})

watch(
  selectedPageId,
  (id) => {
    if (id) void store.load(id)
  },
  { immediate: true },
)

// Chrome (header nav + brand) is tenant-wide — load once, independent of page.
onMounted(() => void chromeStore.load())

function openPreview() {
  const slug = store.page?.slug
  if (!slug || !store.pageId) return
  void store.flush().then(() => {
    const params = new URLSearchParams({
      mode: 'draft',
      pageId: store.pageId,
      returnTo: route.fullPath,
    })
    window.open(`/landing-preview/${slug}?${params.toString()}`, '_blank', 'noopener,noreferrer')
  })
}

async function publish() {
  await store.publish()
}

function onKeydown(event: KeyboardEvent) {
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return
  event.preventDefault()
  if (event.shiftKey) store.redo()
  else store.undo()
}

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (!dirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => {
  void loadPages()
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('beforeunload', onBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('beforeunload', onBeforeUnload)
})

onBeforeRouteLeave(() => {
  if (dirty.value && !window.confirm('Ada perubahan yang belum tersimpan. Tinggalkan halaman?')) {
    return false
  }
  store.reset()
  chromeStore.reset()
  return true
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <PageHeader :title="title || 'Content'" :description="description" />

    <div
      class="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
    >
      <div class="min-w-[220px] flex-1">
        <LandingPagePicker v-model="selectedPageId" :pages="pages" />
      </div>

      <span class="text-sm text-gray-500">{{ savedLabel }}</span>

      <div class="flex items-center gap-1">
        <button
          type="button"
          class="rounded-lg p-2 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800"
          :disabled="!canUndo"
          title="Undo (Ctrl+Z)"
          @click="store.undo()"
        >
          <Undo2 class="size-4" />
        </button>
        <button
          type="button"
          class="rounded-lg p-2 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800"
          :disabled="!canRedo"
          title="Redo (Ctrl+Shift+Z)"
          @click="store.redo()"
        >
          <Redo2 class="size-4" />
        </button>
      </div>

      <div
        class="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5 dark:border-gray-700"
      >
        <button
          type="button"
          class="rounded p-1.5"
          :class="deviceWidth === null ? 'bg-brand-100 text-brand-700' : ''"
          title="Desktop"
          @click="deviceWidth = null"
        >
          <Monitor class="size-4" />
        </button>
        <button
          type="button"
          class="rounded p-1.5"
          :class="deviceWidth === 834 ? 'bg-brand-100 text-brand-700' : ''"
          title="Tablet"
          @click="deviceWidth = 834"
        >
          <Tablet class="size-4" />
        </button>
        <button
          type="button"
          class="rounded p-1.5"
          :class="deviceWidth === 390 ? 'bg-brand-100 text-brand-700' : ''"
          title="Mobile"
          @click="deviceWidth = 390"
        >
          <Smartphone class="size-4" />
        </button>
      </div>

      <BaseButton variant="outline" :disabled="!store.pageId" @click="openPreview">
        Preview
      </BaseButton>
      <BaseButton :disabled="!store.pageId || saving" @click="publish">
        <Rocket class="size-4" />
        Publish
      </BaseButton>
    </div>

    <p v-if="loadError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ loadError }}
    </p>
    <div
      v-if="saveError"
      class="flex items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      <span>{{ saveError }}</span>
      <button
        type="button"
        class="rounded border border-red-300 px-2 py-1 text-xs font-semibold hover:bg-red-100"
        :disabled="saving"
        @click="store.save()"
      >
        Coba lagi
      </button>
    </div>

    <div
      class="grid h-[calc(100vh-260px)] min-h-[520px] grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)_300px]"
    >
      <aside
        class="overflow-auto rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
      >
        <BlockPalette
          @insert="store.insertBlock($event, sections.length)"
          @blockpointerdown="(blockId, event) => canvasFrameRef?.startBlockDrag(blockId, event)"
          @selectchrome="store.select($event)"
        />
      </aside>

      <section
        class="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800"
      >
        <div
          v-if="loading"
          class="flex h-full items-center justify-center gap-2 text-sm text-gray-500"
        >
          <RefreshCw class="size-4 animate-spin" /> Memuat canvas…
        </div>
        <template v-else>
          <CanvasFrame ref="canvasFrameRef" :device-width="deviceWidth" />
          <div
            v-if="sections.length === 0"
            class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-sm text-gray-500"
          >
            <p class="font-semibold">Halaman ini belum punya blok</p>
            <p class="text-xs">
              Klik blok di panel kiri, atau tarik dan lepas langsung ke area kanvas ini.
            </p>
          </div>
        </template>
      </section>

      <aside
        class="overflow-auto rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
      >
        <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          {{ headerSelected ? 'Header & Brand' : 'Properti section' }}
        </p>
        <HeaderBrandPanel v-if="headerSelected" />
        <div
          v-else-if="!selectedSection"
          class="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-gray-400"
        >
          Pilih blok atau Header di kanvas untuk mengeditnya.
        </div>
        <SectionPropertyPanel v-else :key="selectedSection.id" :section="selectedSection" />
      </aside>
    </div>
  </div>
</template>
