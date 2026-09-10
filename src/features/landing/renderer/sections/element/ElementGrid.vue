<script setup lang="ts">
import { computed } from 'vue'
import DOMPurify from 'dompurify'

import { useElementStyle } from './useElementStyle'
import ElementHeadline from './ElementHeadline.vue'
import ElementParagraph from './ElementParagraph.vue'
import ElementButton from './ElementButton.vue'
import ElementImage from './ElementImage.vue'

interface GridCell {
  kind?: 'card' | 'headline' | 'paragraph' | 'button' | 'image'
  // card
  title?: string
  bodyHtml?: string
  imageSrc?: string
  buttonLabel?: string
  buttonUrl?: string
  // element passthrough
  text?: string
  level?: string
  label?: string
  url?: string
  src?: string
  alt?: string
}

const props = defineProps<{
  content: {
    columns?: number
    columnsTablet?: number
    columnsMobile?: number
    gap?: number
    cells?: GridCell[]
  }
  styleConfig?: Record<string, unknown>
}>()

const { boxStyle, layoutStyle } = useElementStyle(() => props.styleConfig)

function clampCols(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 1 && n <= 6 ? Math.round(n) : fallback
}

const gridStyle = computed(() => ({
  ...boxStyle.value,
  '--cols': String(clampCols(props.content?.columns, 3)),
  '--cols-tablet': String(clampCols(props.content?.columnsTablet, 2)),
  '--cols-mobile': String(clampCols(props.content?.columnsMobile, 1)),
  gap: `${typeof props.content?.gap === 'number' ? props.content.gap : 16}px`,
}))

const cells = computed<GridCell[]>(() =>
  Array.isArray(props.content?.cells) ? props.content!.cells! : [],
)

function cardBody(html?: string) {
  return DOMPurify.sanitize(String(html ?? ''), {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'span', 'a', 'p'],
    ALLOWED_ATTR: ['href'],
  })
}
</script>

<template>
  <div class="element-grid" :style="layoutStyle">
    <div class="grid-box" :style="gridStyle">
      <template v-for="(cell, i) in cells" :key="i">
        <article v-if="cell.kind === 'card' || !cell.kind" class="grid-card">
          <img
            v-if="cell.imageSrc"
            :src="cell.imageSrc"
            :alt="cell.title || ''"
            class="grid-card__img"
          />
          <h3 v-if="cell.title" class="grid-card__title">{{ cell.title }}</h3>
          <!-- eslint-disable-next-line vue/no-v-html -- sanitised above -->
          <div v-if="cell.bodyHtml" class="grid-card__body" v-html="cardBody(cell.bodyHtml)" />
          <a v-if="cell.buttonLabel" class="grid-card__btn" :href="cell.buttonUrl || '#'">
            {{ cell.buttonLabel }}
          </a>
        </article>
        <ElementHeadline
          v-else-if="cell.kind === 'headline'"
          :content="{ text: cell.text, level: cell.level }"
          :style-config="{}"
        />
        <ElementParagraph
          v-else-if="cell.kind === 'paragraph'"
          :content="{ bodyHtml: cell.bodyHtml }"
          :style-config="{}"
        />
        <ElementButton
          v-else-if="cell.kind === 'button'"
          :content="{ label: cell.label, url: cell.url }"
          :style-config="{}"
        />
        <ElementImage
          v-else-if="cell.kind === 'image'"
          :content="{ src: cell.src, alt: cell.alt }"
          :style-config="{}"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.element-grid {
  padding: 12px 16px;
}
.grid-box {
  display: grid;
  grid-template-columns: repeat(var(--cols, 3), minmax(0, 1fr));
}
@media (max-width: 1024px) {
  .grid-box {
    grid-template-columns: repeat(var(--cols-tablet, 2), minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .grid-box {
    grid-template-columns: repeat(var(--cols-mobile, 1), minmax(0, 1fr));
  }
}
.grid-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  background: #ffffff;
}
.grid-card__img {
  width: 100%;
  height: auto;
  border-radius: 8px;
}
.grid-card__title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
}
.grid-card__body {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #475569;
}
.grid-card__btn {
  align-self: flex-start;
  margin-top: 4px;
  font-size: 13px;
  font-weight: 600;
  color: #2563eb;
  text-decoration: none;
}
</style>
