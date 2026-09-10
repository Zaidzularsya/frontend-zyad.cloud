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
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f8fafc;
}
.grapes-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 12px;
  background: #1e293b;
  color: #e2e8f0;
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
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.grapes-dev-btn:hover,
.grapes-icon-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
.grapes-dev-btn.is-active {
  background: #2563eb;
  color: #fff;
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
  width: 260px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e2e8f0;
}
.grapes-right {
  border-right: 0;
  border-left: 1px solid #e2e8f0;
}
.grapes-tabs {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
}
.grapes-tabs button {
  flex: 1;
  padding: 8px 4px;
  border: 0;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
}
.grapes-tabs button.is-active {
  color: #2563eb;
  box-shadow: inset 0 -2px 0 #2563eb;
}
.grapes-pane {
  flex: 1;
  overflow: auto;
  min-height: 0;
}
.grapes-canvas {
  flex: 1;
  min-width: 0;
}
</style>
