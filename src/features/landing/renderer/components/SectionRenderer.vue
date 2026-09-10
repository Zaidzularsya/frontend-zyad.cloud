<script setup lang="ts">
import { computed } from 'vue'
import { resolveSection } from '../registry/section-registry'
import type { LandingSection } from '../../shared/types/landing.types'

const props = defineProps<{
  section: LandingSection
  /** Menimpa section.content bila diberikan (dipakai untuk footer, lihat LandingPageRenderer.vue). */
  contentOverride?: Record<string, unknown>
}>()

/**
 * Resolve Vue component dari section-registry berdasarkan type dan variant.
 * Jika tidak ditemukan, section tidak dirender (null component).
 */
const component = computed(() => {
  const type = props.section.type
  // Cek variant dari field 'variant', lalu dari style.renderer_component (legacy), lalu 'default'
  const variant =
    props.section.variant ??
    (typeof props.section.style?.renderer_component === 'string'
      ? props.section.style.renderer_component
      : typeof props.section.style?.variant === 'string'
        ? props.section.style.variant
        : undefined)

  return resolveSection(type, variant)
})

/**
 * Gaya generik yang diterapkan ke pembungkus section untuk SEMUA komponen
 * (bukan hanya template enterprise): jarak vertikal, warna latar, perataan
 * teks. Hanya menghasilkan properti bila key-nya benar-benar diisi, jadi
 * section tanpa style tetap dirender identik.
 */
const wrapperStyle = computed(() => {
  const style = (props.section.style ?? {}) as Record<string, unknown>
  const out: Record<string, string> = {}

  const spacing = style.spacing as { top?: number; bottom?: number } | undefined
  if (spacing && typeof spacing.top === 'number') out.paddingTop = `${spacing.top}px`
  if (spacing && typeof spacing.bottom === 'number') out.paddingBottom = `${spacing.bottom}px`

  const background = style.background as { color?: string } | undefined
  if (background && typeof background.color === 'string' && background.color) {
    out.backgroundColor = background.color
  }

  if (typeof style.align === 'string' && ['left', 'center', 'right'].includes(style.align)) {
    out.textAlign = style.align
  }

  // Advanced layout on `style.box` — lets a whole section overlap / be nudged,
  // mirroring the element-level `layoutStyle` in useElementStyle.ts (no `float`).
  const box = style.box as
    | { zIndex?: number; position?: string; offsetX?: number; offsetY?: number }
    | undefined
  if (box) {
    const hasOffset =
      (typeof box.offsetX === 'number' && box.offsetX !== 0) ||
      (typeof box.offsetY === 'number' && box.offsetY !== 0)
    if (box.position === 'relative' || typeof box.zIndex === 'number' || hasOffset) {
      out.position = 'relative'
    }
    if (typeof box.zIndex === 'number') out.zIndex = String(box.zIndex)
    if (hasOffset) out.transform = `translate(${box.offsetX || 0}px, ${box.offsetY || 0}px)`
  }

  return out
})

const hasWrapperStyle = computed(() => Object.keys(wrapperStyle.value).length > 0)
</script>

<template>
  <component
    :is="component"
    v-if="component && !hasWrapperStyle"
    :content="contentOverride ?? section.content"
    :style-config="section.style"
    :section="section"
  />
  <div v-else-if="component" :style="wrapperStyle">
    <component
      :is="component"
      :content="contentOverride ?? section.content"
      :style-config="section.style"
      :section="section"
    />
  </div>
</template>
