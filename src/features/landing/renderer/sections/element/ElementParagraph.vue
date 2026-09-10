<script setup lang="ts">
import { computed } from 'vue'
import DOMPurify from 'dompurify'
import { useElementStyle } from './useElementStyle'

const props = defineProps<{
  content: { bodyHtml?: string }
  styleConfig?: Record<string, unknown>
}>()

const { textStyle, boxStyle, layoutStyle } = useElementStyle(() => props.styleConfig)

const html = computed(() =>
  DOMPurify.sanitize(String(props.content?.bodyHtml ?? ''), {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'span', 'a', 'p'],
    ALLOWED_ATTR: ['href'],
  }),
)
</script>

<template>
  <div class="element-block" :style="[boxStyle, layoutStyle]">
    <!-- eslint-disable vue/no-v-html -- konten admin tersanitasi backend + DOMPurify di `html` -->
    <div class="element-paragraph" :style="textStyle" data-field="bodyHtml" v-html="html" />
    <!-- eslint-enable vue/no-v-html -->
  </div>
</template>

<style scoped>
.element-block {
  padding: 12px 16px;
}
.element-paragraph {
  margin: 0;
  font-size: 16px;
  line-height: 1.6;
}
</style>
