<script setup lang="ts">
import { computed } from 'vue'
import { resolveSection } from '../registry/section-registry'
import type { LandingSection } from '../../shared/types/landing.types'

const props = defineProps<{
  section: LandingSection
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
</script>

<template>
  <component
    :is="component"
    v-if="component"
    :content="section.content"
    :style-config="section.style"
    :section="section"
  />
</template>
