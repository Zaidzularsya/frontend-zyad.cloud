<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type CSSProperties } from 'vue'

interface HeaderItem {
  id?: string
  label: string
  href: string
  target?: string
}

const props = defineProps<{
  content: {
    // Layout / behavior (per page)
    sticky?: boolean
    hideOnScroll?: boolean
    alignment?: 'left' | 'center' | 'right'
    width?: 'container' | 'full'
    // Visual (per page)
    variant?: 'solid' | 'transparent' | 'glass'
    shadow?: 'none' | 'sm' | 'md'
    /** @deprecated superseded by `variant: 'transparent'` — still read for old pages. */
    transparentOnTop?: boolean
    // Action (per page)
    showLoginCta?: boolean
    ctaLabel?: string
    ctaUrl?: string
    ctaColor?: string
    // Brand — `logoUrl` is the per-page override; `brandLogo*` are the tenant
    // defaults, both injected at synth time (LandingPageRenderer / canvas).
    logoUrl?: string
    brandLogoLight?: string
    brandLogoDark?: string
    /** Synthesized at render time from the tenant location=header menu + branding. */
    items?: HeaderItem[]
    brandName?: string
  }
  styleConfig?: Record<string, unknown>
}>()

const items = computed<HeaderItem[]>(() =>
  Array.isArray(props.content?.items) ? props.content!.items! : [],
)

const brandName = computed(() => props.content?.brandName || '')

const variant = computed<'solid' | 'transparent' | 'glass'>(() => {
  const v = props.content?.variant
  if (v === 'transparent' || v === 'glass' || v === 'solid') return v
  return props.content?.transparentOnTop ? 'transparent' : 'solid'
})

/**
 * Per-page override wins outright; otherwise use the tenant logo, preferring the
 * dark-mode asset when the bar sits on a see-through (transparent/glass) surface.
 */
const logoUrl = computed(() => {
  const own = String(props.content?.logoUrl ?? '').trim()
  if (own) return own
  const light = String(props.content?.brandLogoLight ?? '').trim()
  const dark = String(props.content?.brandLogoDark ?? '').trim()
  const seeThrough = variant.value === 'transparent' || variant.value === 'glass'
  return seeThrough ? dark || light : light || dark
})

const shadowClass = computed(() => {
  const s = props.content?.shadow
  if (s === 'md') return 'has-shadow-md'
  if (s === 'sm') return 'has-shadow-sm'
  return ''
})

// hideOnScroll: collapse the bar when the reader scrolls down, reveal on scroll up.
const collapsed = ref(false)
let lastY = 0

function onScroll() {
  const y = window.scrollY
  if (y < 80) collapsed.value = false
  else if (y > lastY + 4) collapsed.value = true
  else if (y < lastY - 4) collapsed.value = false
  lastY = y
}

onMounted(() => {
  if (!props.content?.hideOnScroll) return
  lastY = window.scrollY
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

const rootClass = computed(() => [
  'header-section',
  `is-${variant.value}`,
  `align-${props.content?.alignment || 'center'}`,
  props.content?.width === 'full' ? 'is-full' : '',
  shadowClass.value,
  props.content?.sticky !== false ? 'is-sticky' : '',
  props.content?.hideOnScroll && collapsed.value ? 'is-collapsed' : '',
])

const ctaStyle = computed<CSSProperties>(() => {
  const color = props.content?.ctaColor
  return typeof color === 'string' && color ? { backgroundColor: color } : {}
})

function isNewTab(target?: string) {
  return target === 'new_tab' || target === '_blank'
}
</script>

<template>
  <header :class="rootClass">
    <div class="header-inner">
      <a class="header-brand" href="/">
        <img v-if="logoUrl" :src="logoUrl" :alt="brandName" class="header-logo" />
        <span v-if="brandName" class="header-name">{{ brandName }}</span>
      </a>

      <nav class="header-links">
        <a
          v-for="(item, i) in items"
          :key="item.id || i"
          :href="item.href"
          :target="isNewTab(item.target) ? '_blank' : undefined"
          :rel="isNewTab(item.target) ? 'noopener noreferrer' : undefined"
          class="header-link"
        >
          {{ item.label }}
        </a>
      </nav>

      <a
        v-if="content?.showLoginCta !== false"
        class="header-cta"
        :href="content?.ctaUrl || '/'"
        :style="ctaStyle"
      >
        {{ content?.ctaLabel || 'Login' }}
      </a>
    </div>
  </header>
</template>

<style scoped>
.header-section {
  width: 100%;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: #ffffff;
  z-index: 40;
  transition: transform 0.25s ease;
}
.header-section.is-sticky {
  position: sticky;
  top: 0;
}
.header-section.is-collapsed {
  transform: translateY(-100%);
}
.header-section.is-transparent {
  background: transparent;
  border-bottom-color: transparent;
}
.header-section.is-glass {
  background: rgba(255, 255, 255, 0.72);
  border-bottom-color: rgba(15, 23, 42, 0.06);
  backdrop-filter: saturate(180%) blur(12px);
  -webkit-backdrop-filter: saturate(180%) blur(12px);
}
.header-section.has-shadow-sm {
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}
.header-section.has-shadow-md {
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.1);
}
.header-inner {
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 14px 24px;
}
.header-section.is-full .header-inner {
  max-width: none;
}
.header-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  text-decoration: none;
  color: inherit;
}
.header-logo {
  height: 28px;
  width: auto;
}
.header-name {
  font-weight: 800;
  font-size: 16px;
  color: #0f172a;
}
.header-links {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 24px;
}
.header-section.align-left .header-links {
  justify-content: flex-start;
}
.header-section.align-right .header-links {
  justify-content: flex-end;
}
.header-link {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  text-decoration: none;
}
.header-link:hover {
  color: #2563eb;
}
.header-cta {
  flex-shrink: 0;
  padding: 8px 18px;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}
</style>
