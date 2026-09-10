<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import { useElementStyle } from './useElementStyle'

const props = defineProps<{
  content?: Record<string, unknown>
  styleConfig?: Record<string, unknown>
}>()

const { box, layoutStyle } = useElementStyle(() => props.styleConfig)

const dividerStyle = computed<CSSProperties>(() => {
  const b = box.value
  return {
    borderTopWidth: `${typeof b.borderWidth === 'number' ? b.borderWidth : 1}px`,
    borderTopColor: b.borderColor || '#e2e8f0',
    maxWidth: typeof b.width === 'number' ? `${b.width}px` : '100%',
  }
})
</script>

<template>
  <div class="element-block" :style="layoutStyle">
    <hr class="element-divider" :style="dividerStyle" />
  </div>
</template>

<style scoped>
.element-block {
  padding: 12px 16px;
}
.element-divider {
  width: 100%;
  margin: 0 auto;
  border: 0;
  border-top-style: solid;
}
</style>
