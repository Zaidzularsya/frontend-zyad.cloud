<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'

import {
  SOCIAL_ICONS,
  safeSocialHref,
  type SocialPlatform,
} from '@/features/landing/shared/icons/socialIcons'
import { useElementStyle } from './useElementStyle'

interface SocialItem {
  platform?: string
  url?: string
  label?: string
}

const props = defineProps<{
  content: {
    direction?: 'row' | 'column'
    gap?: number
    size?: number
    shape?: 'circle' | 'rounded' | 'square'
    style?: 'solid' | 'outline' | 'bare'
    items?: SocialItem[]
  }
  styleConfig?: Record<string, unknown>
}>()

const { layoutStyle } = useElementStyle(() => props.styleConfig)

const colorOverride = computed(() => {
  const c = (props.styleConfig?.colors ?? {}) as { primary?: string }
  return typeof c.primary === 'string' && c.primary ? c.primary : ''
})

const size = computed(() => (typeof props.content?.size === 'number' ? props.content.size : 40))
const iconStyleKind = computed(() => props.content?.style ?? 'solid')

const items = computed(() =>
  (Array.isArray(props.content?.items) ? props.content!.items! : [])
    .map((item) => ({
      ...item,
      icon: SOCIAL_ICONS[item.platform as SocialPlatform],
    }))
    .filter((item) => Boolean(item.icon)),
)

const rowStyle = computed<CSSProperties>(() => ({
  flexDirection: props.content?.direction === 'column' ? 'column' : 'row',
  gap: `${typeof props.content?.gap === 'number' ? props.content.gap : 12}px`,
}))

function radiusFor(): string {
  if (props.content?.shape === 'square') return '0'
  if (props.content?.shape === 'rounded') return '10px'
  return '50%'
}

function buttonStyle(brandColor: string): CSSProperties {
  const accent = colorOverride.value || brandColor
  const base: CSSProperties = {
    width: `${size.value}px`,
    height: `${size.value}px`,
    borderRadius: radiusFor(),
  }
  if (iconStyleKind.value === 'outline') {
    return { ...base, color: accent, background: 'transparent', border: `1px solid ${accent}` }
  }
  if (iconStyleKind.value === 'bare') {
    return { ...base, color: accent, background: 'transparent' }
  }
  return { ...base, color: '#ffffff', background: accent }
}
</script>

<template>
  <div class="element-block" :style="layoutStyle">
    <div class="social-row" :style="rowStyle">
      <a
        v-for="(item, i) in items"
        :key="i"
        class="social-row__btn"
        :href="safeSocialHref(item.url)"
        :aria-label="item.label || item.icon.label"
        target="_blank"
        rel="noopener noreferrer"
        :style="buttonStyle(item.icon.brandColor)"
      >
        <svg
          class="social-row__icon"
          viewBox="0 0 24 24"
          role="img"
          aria-hidden="true"
          focusable="false"
        >
          <path :d="item.icon.path" fill="currentColor" />
        </svg>
      </a>
    </div>
  </div>
</template>

<style scoped>
.element-block {
  padding: 12px 16px;
}
.social-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}
.social-row__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  text-decoration: none;
  transition: opacity 0.15s ease;
}
.social-row__btn:hover {
  opacity: 0.85;
}
.social-row__icon {
  width: 55%;
  height: 55%;
}
</style>
