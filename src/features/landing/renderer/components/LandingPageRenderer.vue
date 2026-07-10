<script setup lang="ts">
import { computed, ref } from 'vue'
import SectionRenderer from './SectionRenderer.vue'
import { useScrollReveal } from '../composables/useScrollReveal'
import type { LandingPage, LandingSection } from '../../shared/types/landing.types'

const props = defineProps<{
  page: LandingPage
  /**
   * Optional: sections override.
   * Jika tidak diberikan, menggunakan page.sections (jika ada).
   * Untuk backward compat dengan renderer yang mendapat sections dari luar.
   */
  sections?: LandingSection[]
}>()

/**
 * Ambil sections dari prop override atau dari page.sections.
 * Filter hanya yang is_enabled/isVisible === true, sort by sort_order/sortOrder.
 */
const visibleSections = computed(() => {
  const rawSections =
    props.sections ??
    ((props.page as unknown as Record<string, unknown>).sections as LandingSection[] | undefined) ??
    []
  return [...rawSections]
    .filter((section) => section.is_enabled !== false && section.isVisible !== false)
    .sort((a, b) => {
      const orderA = a.sort_order ?? a.sortOrder ?? 0
      const orderB = b.sort_order ?? b.sortOrder ?? 0
      return orderA - orderB
    })
})

const rootRef = ref<HTMLElement | null>(null)
useScrollReveal(rootRef)
</script>

<template>
  <main ref="rootRef">
    <SectionRenderer
      v-for="section in visibleSections"
      :key="section.id || `${section.type}-${section.sort_order ?? section.sortOrder}`"
      :section="section"
    />
  </main>
</template>
