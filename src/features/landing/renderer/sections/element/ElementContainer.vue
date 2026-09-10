<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'

import { useElementStyle } from './useElementStyle'
import ElementHeadline from './ElementHeadline.vue'
import ElementParagraph from './ElementParagraph.vue'
import ElementButton from './ElementButton.vue'
import ElementImage from './ElementImage.vue'

interface SlotItem {
  kind?: 'headline' | 'paragraph' | 'button' | 'image'
  text?: string
  level?: string
  bodyHtml?: string
  label?: string
  url?: string
  target?: string
  src?: string
  alt?: string
}

const props = defineProps<{
  content: {
    maxWidth?: number
    padding?: number
    gap?: number
    align?: 'start' | 'center' | 'end' | 'stretch'
    items?: SlotItem[]
  }
  styleConfig?: Record<string, unknown>
}>()

const { boxStyle, layoutStyle } = useElementStyle(() => props.styleConfig)

const background = computed(() => {
  const bg = (props.styleConfig?.background ?? {}) as { color?: string }
  return typeof bg.color === 'string' && bg.color ? bg.color : undefined
})

const ALIGN_MAP: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
}

const boxCss = computed<CSSProperties>(() => ({
  ...boxStyle.value,
  maxWidth: typeof props.content?.maxWidth === 'number' ? `${props.content.maxWidth}px` : '100%',
  padding: `${typeof props.content?.padding === 'number' ? props.content.padding : 24}px`,
  gap: `${typeof props.content?.gap === 'number' ? props.content.gap : 16}px`,
  alignItems: ALIGN_MAP[props.content?.align ?? 'stretch'] ?? 'stretch',
  background: background.value,
}))

const items = computed<SlotItem[]>(() =>
  Array.isArray(props.content?.items) ? props.content!.items! : [],
)
</script>

<template>
  <div class="element-container" :style="layoutStyle">
    <div class="container-box" :style="boxCss">
      <template v-for="(item, i) in items" :key="i">
        <ElementHeadline
          v-if="item.kind === 'headline'"
          :content="{ text: item.text, level: item.level }"
          :style-config="{}"
        />
        <ElementParagraph
          v-else-if="item.kind === 'paragraph'"
          :content="{ bodyHtml: item.bodyHtml }"
          :style-config="{}"
        />
        <ElementButton
          v-else-if="item.kind === 'button'"
          :content="{ label: item.label, url: item.url, target: item.target }"
          :style-config="{}"
        />
        <ElementImage
          v-else-if="item.kind === 'image'"
          :content="{ src: item.src, alt: item.alt }"
          :style-config="{}"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.element-container {
  padding: 12px 16px;
}
.container-box {
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}
</style>
