<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'

interface HeaderItem {
  id?: string
  label: string
  href: string
  target?: string
}

const props = defineProps<{
  content: {
    sticky?: boolean
    transparentOnTop?: boolean
    showLoginCta?: boolean
    ctaLabel?: string
    ctaUrl?: string
    ctaColor?: string
    logoUrl?: string
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
const logoUrl = computed(() => String(props.content?.logoUrl ?? '').trim())

const rootClass = computed(() => [
  'header-section',
  props.content?.sticky !== false ? 'is-sticky' : '',
  props.content?.transparentOnTop ? 'is-transparent' : '',
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
}
.header-section.is-sticky {
  position: sticky;
  top: 0;
}
.header-section.is-transparent {
  background: transparent;
  border-bottom-color: transparent;
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
