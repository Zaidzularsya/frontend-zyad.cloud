<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import SectionRenderer from './SectionRenderer.vue'
import { useScrollReveal } from '../composables/useScrollReveal'
import { provideEditMode } from '../composables/useEditMode'
import type { LandingPage, LandingSection } from '../../shared/types/landing.types'

const props = defineProps<{
  page: LandingPage
  /**
   * Optional: sections override.
   * Jika tidak diberikan, menggunakan page.sections (jika ada).
   * Untuk backward compat dengan renderer yang mendapat sections dari luar.
   */
  sections?: LandingSection[]
  /**
   * Data footer yang diturunkan dari branding + menu + settings (lihat
   * DynamicLandingPage.vue). Menimpa content section bertipe "footer" karena
   * section itu sendiri tidak diedit manual sebagai konten mentah.
   */
  footerContent?: Record<string, unknown>
  /**
   * Data header (item menu tenant + brand) yang di-synthesize di
   * DynamicLandingPage / builder canvas. Menimpa content section bertipe
   * "header" — pola sama seperti footerContent.
   */
  headerChrome?: {
    items: unknown[]
    brandName: string
    brandLogoUrl: string
    brandLogoDarkUrl?: string
  }
  /**
   * Aktif saat renderer dipakai di dalam canvas builder: section components
   * menetralkan side-effect (fetch/navigasi/POST/WebGL/scroll) dan semua
   * elemen `.fade-up` langsung terlihat tanpa menunggu scroll-reveal.
   */
  editMode?: boolean
}>()

provideEditMode(computed(() => props.editMode ?? false))

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

function contentOverrideFor(section: LandingSection): Record<string, unknown> | undefined {
  if (section.type === 'footer') return props.footerContent
  if (section.type === 'header') {
    const chrome = props.headerChrome ?? {
      items: [],
      brandName: '',
      brandLogoUrl: '',
      brandLogoDarkUrl: '',
    }
    const own = (section.content ?? {}) as Record<string, unknown>
    return {
      ...own,
      items: chrome.items,
      brandName: chrome.brandName,
      logoUrl: own.logoUrl ?? '',
      brandLogoLight: chrome.brandLogoUrl,
      brandLogoDark: chrome.brandLogoDarkUrl ?? '',
    }
  }
  return undefined
}

// Di canvas builder, jangan biarkan section di bawah lipatan tetap opacity:0 —
// paksa semua `.fade-up` terlihat setiap kali daftar section berubah.
watch(
  [() => props.editMode, visibleSections],
  async () => {
    if (!props.editMode) return
    await nextTick()
    rootRef.value
      ?.querySelectorAll<HTMLElement>('.fade-up')
      .forEach((element) => element.classList.add('visible'))
  },
  { immediate: true },
)
</script>

<template>
  <main ref="rootRef">
    <SectionRenderer
      v-for="section in visibleSections"
      :key="section.id || `${section.type}-${section.sort_order ?? section.sortOrder}`"
      :section="section"
      :content-override="contentOverrideFor(section)"
    />
  </main>
</template>
