<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'

import {
  readHeaderPresentation,
  safeHref,
  type GrapesChrome,
  type GrapesChromeLink,
} from '../../grapes/chrome'

/**
 * Slot `tenant-nav`. Position classes go on the sentinel element (`host`), not
 * on the <header>, so `position: sticky` works relative to `.zy-page`.
 */
const props = defineProps<{
  host: HTMLElement
  chrome: GrapesChrome
  dataset: Record<string, string>
}>()

const HOST_BASE = 'zyad-tenant-header-host'
const HOST_CLASSES = [
  HOST_BASE,
  `${HOST_BASE}--sticky`,
  `${HOST_BASE}--fixed`,
  `${HOST_BASE}--hidden`,
]

const presentation = computed(() => readHeaderPresentation(props.dataset.zyadHeader ?? null))
const headerHidden = ref(false)
let lastScrollY = 0

function handleScroll() {
  if (!presentation.value.hideOnScroll) return
  const y = window.scrollY
  const delta = y - lastScrollY
  if (Math.abs(delta) < 4) return
  headerHidden.value = delta > 0 && y > 80
  lastScrollY = y
}

// flush 'sync' keeps the host class in step with scroll state without waiting
// for a render tick (the host lives outside this component's DOM).
watchEffect(
  () => {
    const p = presentation.value
    props.host.classList.add(HOST_BASE)
    props.host.classList.toggle(`${HOST_BASE}--sticky`, p.position === 'sticky')
    props.host.classList.toggle(`${HOST_BASE}--fixed`, p.position === 'fixed')
    props.host.classList.toggle(`${HOST_BASE}--hidden`, p.hideOnScroll && headerHidden.value)
  },
  { flush: 'sync' },
)

onMounted(() => window.addEventListener('scroll', handleScroll, { passive: true }))
onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
  props.host.classList.remove(...HOST_CLASSES)
  if (!props.host.getAttribute('class')) props.host.removeAttribute('class')
})

const headerClasses = computed(() => {
  const p = presentation.value
  return [
    `zyad-tenant-header--${p.variant}`,
    `zyad-tenant-header--${p.layout}`,
    p.layout === 'grouped' ? `zyad-tenant-header--group-${p.groupAlign}` : '',
    p.container ? 'zyad-tenant-header--container' : '',
  ].filter(Boolean)
})

// CSS custom properties so the shared nav-link rule (and :hover) still applies.
const headerStyleVars = computed(() => ({
  '--zyad-header-brand-color': presentation.value.brandColor,
  '--zyad-header-nav-color': presentation.value.navColor,
}))

function linkTarget(link: GrapesChromeLink): '_blank' | undefined {
  return link.target === 'new_tab' || link.target === '_blank' ? '_blank' : undefined
}
</script>

<template>
  <header class="zyad-tenant-header" :class="headerClasses" :style="headerStyleVars">
    <div class="zyad-tenant-header__inner">
      <a class="zyad-tenant-header__brand" href="/">
        <img
          v-if="chrome.brand?.logoUrl"
          :src="safeHref(chrome.brand.logoUrl)"
          :alt="chrome.brand?.name || ''"
        />
        <span v-if="chrome.brand?.name">{{ chrome.brand.name }}</span>
      </a>
      <nav class="zyad-tenant-header__nav">
        <a
          v-for="(link, i) in chrome.nav ?? []"
          :key="i"
          :href="safeHref(link.href)"
          :target="linkTarget(link)"
          :rel="linkTarget(link) ? 'noopener noreferrer' : undefined"
        >
          {{ link.label }}
        </a>
      </nav>
      <a
        v-if="presentation.showAction && (presentation.actionLabel || presentation.actionUrl)"
        class="zyad-tenant-header__action"
        :href="safeHref(presentation.actionUrl)"
      >
        {{ presentation.actionLabel || 'Masuk' }}
      </a>
    </div>
  </header>
</template>
