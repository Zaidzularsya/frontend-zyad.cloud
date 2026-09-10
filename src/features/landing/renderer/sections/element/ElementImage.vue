<script setup lang="ts">
import { computed } from 'vue'
import { useElementStyle } from './useElementStyle'

const props = defineProps<{
  content: { src?: string; alt?: string }
  styleConfig?: Record<string, unknown>
}>()

const { boxStyle } = useElementStyle(() => props.styleConfig)

const src = computed(() => String(props.content?.src ?? '').trim())
</script>

<template>
  <div class="element-block">
    <img v-if="src" class="element-image" :src="src" :alt="content?.alt || ''" :style="boxStyle" />
    <div v-else class="element-image-placeholder" :style="boxStyle">
      <span class="material-symbols-outlined">image</span>
      <span>Upload atau tempel URL gambar di panel properti</span>
    </div>
  </div>
</template>

<style scoped>
.element-block {
  padding: 12px 16px;
}
.element-image {
  display: inline-block;
  max-width: 100%;
  height: auto;
  vertical-align: middle;
}
.element-image-placeholder {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 32px 40px;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  color: #94a3b8;
  font-size: 13px;
}
</style>
