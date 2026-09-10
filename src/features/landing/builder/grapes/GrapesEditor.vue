<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import grapesjs, { type Editor } from 'grapesjs'
import { Monitor, Redo2, Smartphone, Tablet, Undo2 } from 'lucide-vue-next'
import 'grapesjs/dist/css/grapes.min.css'

import { buildGrapesConfig } from './grapes.config'
import { GRAPES_DEVICES } from './grapes.devices'

const props = withDefaults(defineProps<{ initial?: { html?: string; css?: string } }>(), {
  initial: () => ({}),
})

const canvasRef = ref<HTMLElement | null>(null)
const blocksRef = ref<HTMLElement | null>(null)
const layersRef = ref<HTMLElement | null>(null)
const stylesRef = ref<HTMLElement | null>(null)
const traitsRef = ref<HTMLElement | null>(null)

const editor = shallowRef<Editor | null>(null)
const leftTab = ref<'blocks' | 'layers'>('blocks')
const rightTab = ref<'styles' | 'traits'>('styles')
const activeDevice = ref('Desktop')

const DEVICE_ICONS = { Desktop: Monitor, Tablet, Mobile: Smartphone } as const

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

onMounted(() => {
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
  if (props.initial?.html) ed.setComponents(props.initial.html)
  if (props.initial?.css) ed.setStyle(props.initial.css)
  editor.value = ed
})

onBeforeUnmount(() => {
  editor.value?.destroy()
  editor.value = null
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
      </div>
    </div>

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

  display: flex;
  flex-direction: column;
  height: 100vh;
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
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease;
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

/* ── Targeted GrapesJS chrome overrides the vars don't fully cover ─────────── */
.grapes-shell :deep(.gjs-block) {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  color: #475569;
  min-height: 74px;
  transition:
    border-color 0.12s ease,
    background 0.12s ease,
    box-shadow 0.12s ease;
}
.grapes-shell :deep(.gjs-block:hover) {
  border-color: #465fff;
  background: #eef4ff;
  color: #1e293b;
  box-shadow: 0 1px 3px rgba(70, 95, 255, 0.15);
}
.grapes-shell :deep(.gjs-block__media svg) {
  fill: #64748b;
}
.grapes-shell :deep(.gjs-block-category .gjs-title),
.grapes-shell :deep(.gjs-sm-sector-title),
.grapes-shell :deep(.gjs-layer-title) {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
}
.grapes-shell :deep(.gjs-field),
.grapes-shell :deep(.gjs-sm-field input),
.grapes-shell :deep(.gjs-clm-select),
.grapes-shell :deep(.gjs-select) {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}
.grapes-shell :deep(.gjs-field:focus-within) {
  border-color: #465fff;
}
.grapes-shell :deep(.gjs-layer.gjs-selected),
.grapes-shell :deep(.gjs-layer:hover) {
  background: #eef4ff;
}
.grapes-shell :deep(.gjs-toolbar) {
  background: #465fff;
  border-radius: 8px;
}
.grapes-shell :deep(.gjs-badge),
.grapes-shell :deep(.gjs-placeholder) {
  border-radius: 4px;
}
.grapes-shell :deep(.gjs-cm-editor-btn) {
  border-radius: 6px;
}
</style>
