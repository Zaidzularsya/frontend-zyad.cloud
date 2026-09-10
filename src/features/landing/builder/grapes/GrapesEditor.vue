<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import grapesjs, { type Editor } from 'grapesjs'
import { Loader2, Monitor, Redo2, Rocket, Smartphone, Tablet, Undo2 } from 'lucide-vue-next'
import 'grapesjs/dist/css/grapes.min.css'

import { useLandingDocumentStore } from '@/stores/landingDocument'
import { buildGrapesConfig } from './grapes.config'
import { GRAPES_DEVICES } from './grapes.devices'

const props = defineProps<{ pageId: string }>()

const store = useLandingDocumentStore()

const canvasRef = ref<HTMLElement | null>(null)
const blocksRef = ref<HTMLElement | null>(null)
const layersRef = ref<HTMLElement | null>(null)
const stylesRef = ref<HTMLElement | null>(null)
const traitsRef = ref<HTMLElement | null>(null)

const editor = shallowRef<Editor | null>(null)
const leftTab = ref<'blocks' | 'layers'>('blocks')
const rightTab = ref<'styles' | 'traits'>('styles')
const activeDevice = ref('Desktop')
const publishing = ref(false)
const publishNotice = ref('')
let ready = false
let saveDebounce: ReturnType<typeof setTimeout> | null = null

const DEVICE_ICONS = { Desktop: Monitor, Tablet, Mobile: Smartphone } as const

const savedLabel = computed(() => {
  if (store.saving) return 'Menyimpan…'
  if (store.saveError) return store.saveError
  if (store.dirty) return 'Belum tersimpan'
  if (store.lastSavedAt) {
    return `Tersimpan ${new Date(store.lastSavedAt).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  }
  return 'Tersimpan'
})

function setDevice(name: string) {
  activeDevice.value = name
  editor.value?.setDevice(name)
}
function undo() {
  editor.value?.runCommand('core:undo')
}
function redo() {
  editor.value?.runCommand('core:redo')
}

function pushSnapshot() {
  const ed = editor.value
  if (!ready || !ed) return
  store.applyEditorSnapshot({
    project: ed.getProjectData() as Record<string, unknown>,
    html: ed.getHtml(),
    css: ed.getCss() ?? '',
  })
}

async function onPublish() {
  publishing.value = true
  publishNotice.value = ''
  try {
    await store.publish()
    publishNotice.value = 'Halaman dipublish.'
  } catch (error) {
    publishNotice.value =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      'Gagal publish.'
  } finally {
    publishing.value = false
    window.setTimeout(() => (publishNotice.value = ''), 4000)
  }
}

onMounted(async () => {
  if (
    !canvasRef.value ||
    !blocksRef.value ||
    !layersRef.value ||
    !stylesRef.value ||
    !traitsRef.value
  ) {
    return
  }

  const ed = grapesjs.init(
    buildGrapesConfig({
      container: canvasRef.value,
      blocks: blocksRef.value,
      layers: layersRef.value,
      styles: stylesRef.value,
      traits: traitsRef.value,
    }),
  )
  editor.value = ed

  await store.load(props.pageId)
  const project = store.project
  if (
    project &&
    typeof project === 'object' &&
    Array.isArray((project as { pages?: unknown }).pages)
  ) {
    ed.loadProjectData(project)
  }

  // Let the initial load settle before autosave starts tracking edits.
  window.setTimeout(() => {
    ready = true
  }, 400)

  const onChange = () => {
    if (saveDebounce) clearTimeout(saveDebounce)
    saveDebounce = setTimeout(pushSnapshot, 600)
  }
  ed.on('update', onChange)
  ed.on('component:update', onChange)
  ed.on('component:add', onChange)
  ed.on('component:remove', onChange)
  ed.on('style:update', onChange)
})

onBeforeUnmount(() => {
  if (saveDebounce) clearTimeout(saveDebounce)
  editor.value?.destroy()
  editor.value = null
  ready = false
})

onBeforeRouteLeave(() => {
  if (store.dirty && !window.confirm('Ada perubahan yang belum tersimpan. Tinggalkan halaman?')) {
    return false
  }
  return true
})

defineExpose({ editor })
</script>

<template>
  <div class="grapes-shell">
    <div class="grapes-topbar">
      <div class="grapes-devices">
        <button
          v-for="d in GRAPES_DEVICES"
          :key="d.id"
          type="button"
          class="grapes-dev-btn"
          :class="{ 'is-active': activeDevice === d.name }"
          :title="d.name"
          @click="setDevice(d.name)"
        >
          <component :is="DEVICE_ICONS[d.name as keyof typeof DEVICE_ICONS]" class="size-4" />
        </button>
      </div>
      <div class="grapes-actions">
        <button type="button" class="grapes-icon-btn" title="Urungkan" @click="undo">
          <Undo2 class="size-4" />
        </button>
        <button type="button" class="grapes-icon-btn" title="Ulangi" @click="redo">
          <Redo2 class="size-4" />
        </button>
        <span
          class="grapes-saved"
          :class="{ 'is-error': !!store.saveError }"
          :title="store.saveError || undefined"
        >
          {{ savedLabel }}
        </span>
        <button
          type="button"
          class="grapes-publish"
          :disabled="publishing || store.saving"
          @click="onPublish"
        >
          <Loader2 v-if="publishing" class="size-4 animate-spin" />
          <Rocket v-else class="size-4" />
          Publish
        </button>
      </div>
    </div>
    <p v-if="publishNotice" class="grapes-notice">{{ publishNotice }}</p>
    <p v-if="store.loadError" class="grapes-notice is-error">{{ store.loadError }}</p>

    <div class="grapes-body">
      <aside class="grapes-left">
        <div class="grapes-tabs">
          <button
            type="button"
            :class="{ 'is-active': leftTab === 'blocks' }"
            @click="leftTab = 'blocks'"
          >
            Blok
          </button>
          <button
            type="button"
            :class="{ 'is-active': leftTab === 'layers' }"
            @click="leftTab = 'layers'"
          >
            Layer
          </button>
        </div>
        <div v-show="leftTab === 'blocks'" ref="blocksRef" class="grapes-pane"></div>
        <div v-show="leftTab === 'layers'" ref="layersRef" class="grapes-pane"></div>
      </aside>

      <div ref="canvasRef" class="grapes-canvas"></div>

      <aside class="grapes-right">
        <div class="grapes-tabs">
          <button
            type="button"
            :class="{ 'is-active': rightTab === 'styles' }"
            @click="rightTab = 'styles'"
          >
            Style
          </button>
          <button
            type="button"
            :class="{ 'is-active': rightTab === 'traits' }"
            @click="rightTab = 'traits'"
          >
            Setelan
          </button>
        </div>
        <div v-show="rightTab === 'styles'" ref="stylesRef" class="grapes-pane"></div>
        <div v-show="rightTab === 'traits'" ref="traitsRef" class="grapes-pane"></div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.grapes-shell {
  /* ── GrapesJS light theme, aligned to the zyad.cloud admin palette ──────────
     GrapesJS reads these on its own root; we scope them here so only the editor
     chrome (panels/toolbars/handles) is re-themed — the canvas <iframe> content
     stays untouched. */
  --gjs-primary-color: #ffffff;
  --gjs-secondary-color: #475569;
  --gjs-tertiary-color: #465fff;
  --gjs-quaternary-color: #3641f5;
  --gjs-font-color: #475569;
  --gjs-font-color-active: #0f172a;
  --gjs-main-dark-color: #e2e8f0;
  --gjs-secondary-dark-color: #f1f5f9;
  --gjs-main-light-color: #f8fafc;
  --gjs-secondary-light-color: #64748b;
  --gjs-color-highlight: #465fff;
  --gjs-light-border: #e2e8f0;
  --gjs-arrow-color: #94a3b8;
  --gjs-placeholder-background-color: #465fff;
  --gjs-main-font: 'Inter', 'Segoe UI', sans-serif;
  --gjs-font-size: 12px;
  /* We host our own panels/top-bar outside the GrapesJS container, so it must
     not reserve room for its default left panel / top bar — this is what makes
     the canvas sit flush and centred. */
  --gjs-left-width: 0px;
  --gjs-canvas-top: 0px;

  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #f8fafc;
  color: #0f172a;
  font-family: 'Inter', 'Segoe UI', sans-serif;
}

.grapes-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 14px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
}
.grapes-devices,
.grapes-actions {
  display: flex;
  gap: 4px;
}
.grapes-dev-btn,
.grapes-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease;
}
.grapes-dev-btn :deep(svg),
.grapes-icon-btn :deep(svg) {
  width: 15px;
  height: 15px;
}
.grapes-dev-btn:hover,
.grapes-icon-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}
.grapes-dev-btn.is-active {
  background: #eef4ff;
  color: #465fff;
}
.grapes-actions {
  align-items: center;
}
.grapes-saved {
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
  padding: 0 6px;
  white-space: nowrap;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.grapes-saved.is-error {
  color: #dc2626;
}
.grapes-publish {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 14px;
  border: 0;
  border-radius: 8px;
  background: #465fff;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.12s ease,
    opacity 0.12s ease;
}
.grapes-publish:hover:not(:disabled) {
  background: #3641f5;
}
.grapes-publish:disabled {
  opacity: 0.6;
  cursor: default;
}
.grapes-publish :deep(svg) {
  width: 14px;
  height: 14px;
}
.grapes-notice {
  margin: 0;
  padding: 8px 14px;
  background: #eef4ff;
  color: #3641f5;
  font-size: 12px;
  border-bottom: 1px solid #dbe4ff;
}
.grapes-notice.is-error {
  background: #fef2f2;
  color: #dc2626;
  border-bottom-color: #fecaca;
}

.grapes-body {
  flex: 1;
  display: flex;
  min-height: 0;
}
.grapes-left,
.grapes-right {
  display: flex;
  flex-direction: column;
  width: 264px;
  flex-shrink: 0;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
}
.grapes-right {
  border-right: 0;
  border-left: 1px solid #e2e8f0;
}
.grapes-tabs {
  display: flex;
  gap: 2px;
  padding: 6px 6px 0;
  border-bottom: 1px solid #e2e8f0;
}
.grapes-tabs button {
  flex: 1;
  padding: 8px 4px;
  border: 0;
  border-radius: 8px 8px 0 0;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: color 0.12s ease;
}
.grapes-tabs button:hover {
  color: #0f172a;
}
.grapes-tabs button.is-active {
  color: #465fff;
  box-shadow: inset 0 -2px 0 #465fff;
}
.grapes-pane {
  flex: 1;
  overflow: auto;
  min-height: 0;
}
.grapes-canvas {
  flex: 1;
  min-width: 0;
  background: #eef2f7;
}

/* ── GrapesJS chrome: canvas view ─────────────────────────────────────────── */
.grapes-shell :deep(.gjs-cv-canvas) {
  background: #eef2f7;
  padding: 20px;
}
.grapes-shell :deep(.gjs-frame-wrapper) {
  padding: 0;
}
.grapes-shell :deep(.gjs-frame) {
  border-radius: 10px;
  box-shadow:
    0 0 0 1px #e2e8f0,
    0 14px 40px rgba(15, 23, 42, 0.1);
  background: #ffffff;
}

/* ── GrapesJS chrome: block palette ──────────────────────────────────────── */
.grapes-shell :deep(.gjs-blocks-c) {
  padding: 8px 10px 14px;
  justify-content: space-between;
}
.grapes-shell :deep(.gjs-block) {
  width: calc(50% - 5px);
  min-width: 0;
  min-height: 60px;
  margin: 5px 0;
  padding: 10px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  color: #64748b;
  font-size: 11px;
  font-weight: 500;
  box-shadow: none;
  transition:
    border-color 0.12s ease,
    background 0.12s ease,
    box-shadow 0.12s ease,
    color 0.12s ease;
}
.grapes-shell :deep(.gjs-block:hover) {
  border-color: #465fff;
  background: #f5f7ff;
  color: #1e293b;
  box-shadow: 0 2px 8px rgba(70, 95, 255, 0.12);
}
.grapes-shell :deep(.gjs-block__media) {
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
}
.grapes-shell :deep(.gjs-block__media > *) {
  max-width: 24px;
  max-height: 24px;
  font-size: 22px;
}
.grapes-shell :deep(.gjs-block:hover .gjs-block__media) {
  color: #465fff;
}
.grapes-shell :deep(.gjs-block-label) {
  font-size: 11px;
}

/* ── GrapesJS chrome: section / category headers ─────────────────────────── */
.grapes-shell :deep(.gjs-block-category .gjs-title),
.grapes-shell :deep(.gjs-category-title),
.grapes-shell :deep(.gjs-sm-sector-title),
.grapes-shell :deep(.gjs-layer-title-c),
.grapes-shell :deep(.gjs-clm-tags .gjs-clm-header) {
  background: transparent;
  border: 0;
  border-bottom: 1px solid #f1f5f9;
  padding: 12px 12px 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #94a3b8;
}
.grapes-shell :deep(.gjs-sm-sector.gjs-sm-open .gjs-sm-sector-title) {
  color: #475569;
}

/* ── GrapesJS chrome: fields, style manager, layers ──────────────────────── */
.grapes-shell :deep(.gjs-field),
.grapes-shell :deep(.gjs-sm-field input),
.grapes-shell :deep(.gjs-sm-field select),
.grapes-shell :deep(.gjs-clm-select),
.grapes-shell :deep(.gjs-select) {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}
.grapes-shell :deep(.gjs-field:focus-within) {
  border-color: #465fff;
  box-shadow: 0 0 0 3px rgba(70, 95, 255, 0.12);
}
.grapes-shell :deep(.gjs-sm-properties) {
  padding: 8px 10px;
}
.grapes-shell :deep(.gjs-sm-property) {
  padding: 6px 0;
}
.grapes-shell :deep(.gjs-sm-label),
.grapes-shell :deep(.gjs-trt-trait__label) {
  font-size: 10px;
  letter-spacing: 0.03em;
  color: #64748b;
}
.grapes-shell :deep(.gjs-trt-traits) {
  padding: 10px;
}
.grapes-shell :deep(.gjs-trt-trait) {
  padding: 6px 0;
}
.grapes-shell :deep(.gjs-layer.gjs-selected),
.grapes-shell :deep(.gjs-layer:hover) {
  background: #f5f7ff;
}
.grapes-shell :deep(.gjs-layer-title) {
  border-radius: 6px;
}

/* ── GrapesJS chrome: canvas overlays ────────────────────────────────────── */
.grapes-shell :deep(.gjs-toolbar) {
  background: #465fff;
  border-radius: 8px;
}
.grapes-shell :deep(.gjs-badge) {
  background: #465fff;
  border-radius: 4px;
  font-weight: 600;
}
.grapes-shell :deep(.gjs-placeholder) {
  border-radius: 4px;
}
.grapes-shell :deep(.gjs-resizer-h) {
  border-color: #465fff;
  background: #ffffff;
}
</style>
