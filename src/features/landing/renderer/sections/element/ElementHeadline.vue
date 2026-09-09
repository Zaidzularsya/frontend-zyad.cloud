<script setup lang="ts">
import { computed } from 'vue'
import { useElementStyle } from './useElementStyle'

const props = defineProps<{
  content: { text?: string; level?: string }
  styleConfig?: Record<string, unknown>
}>()

const { textStyle } = useElementStyle(() => props.styleConfig)

const tag = computed(() => {
  const level = props.content?.level
  return level && ['h1', 'h2', 'h3', 'h4'].includes(level) ? level : 'h2'
})
</script>

<template>
  <div class="element-block">
    <component :is="tag" class="element-headline" :style="textStyle" data-field="text">
      {{ content?.text || 'Judul baru' }}
    </component>
  </div>
</template>

<style scoped>
.element-block {
  padding: 12px 16px;
}
.element-headline {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.25;
}
</style>
