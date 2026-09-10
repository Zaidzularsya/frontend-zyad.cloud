<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import { useElementStyle } from './useElementStyle'

interface ButtonItem {
  label?: string
  url?: string
  target?: string
  variant?: 'primary' | 'secondary' | 'ghost'
}

const props = defineProps<{
  content: {
    direction?: 'row' | 'column'
    gap?: number
    wrap?: boolean
    align?: 'start' | 'center' | 'end' | 'stretch'
    items?: ButtonItem[]
  }
  styleConfig?: Record<string, unknown>
}>()

const { boxStyle, textStyle, layoutStyle } = useElementStyle(() => props.styleConfig)

const colors = computed(
  () => (props.styleConfig?.colors ?? {}) as { primary?: string; text?: string },
)
const primary = computed(() => colors.value.primary || '#2563EB')
const onPrimary = computed(() => colors.value.text || '#ffffff')

const items = computed<ButtonItem[]>(() =>
  Array.isArray(props.content?.items) ? props.content!.items! : [],
)

const ALIGN_MAP: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
}

const rowStyle = computed<CSSProperties>(() => {
  const align = ALIGN_MAP[props.content?.align ?? 'center'] ?? 'center'
  return {
    flexDirection: props.content?.direction === 'column' ? 'column' : 'row',
    gap: `${typeof props.content?.gap === 'number' ? props.content.gap : 12}px`,
    flexWrap: props.content?.wrap === false ? 'nowrap' : 'wrap',
    alignItems: align,
    justifyContent: align === 'stretch' ? 'flex-start' : align,
  }
})

function buttonStyle(item: ButtonItem): CSSProperties {
  const base: CSSProperties = { ...boxStyle.value, ...textStyle.value }
  if (item.variant === 'ghost') {
    return { ...base, background: 'transparent', color: primary.value }
  }
  if (item.variant === 'secondary') {
    return {
      ...base,
      background: 'transparent',
      color: primary.value,
      border: `1px solid ${primary.value}`,
    }
  }
  return { ...base, background: primary.value, color: onPrimary.value }
}

function isBlank(target?: string) {
  return target === '_blank'
}
</script>

<template>
  <div class="element-block" :style="layoutStyle">
    <div class="button-group" :style="rowStyle">
      <a
        v-for="(item, i) in items"
        :key="i"
        class="button-group__btn"
        :href="item.url || '#'"
        :target="isBlank(item.target) ? '_blank' : undefined"
        :rel="isBlank(item.target) ? 'noopener noreferrer' : undefined"
        :style="buttonStyle(item)"
      >
        {{ item.label || 'Tombol' }}
      </a>
    </div>
  </div>
</template>

<style scoped>
.element-block {
  padding: 12px 16px;
}
.button-group {
  display: flex;
}
.button-group__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  line-height: 1.2;
  text-decoration: none;
}
</style>
