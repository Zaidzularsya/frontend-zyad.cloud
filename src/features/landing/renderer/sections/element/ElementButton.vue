<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import { useElementStyle } from './useElementStyle'

const props = defineProps<{
  content: { label?: string; url?: string; target?: string }
  styleConfig?: Record<string, unknown>
}>()

const { boxStyle, textStyle } = useElementStyle(() => props.styleConfig)

const colors = computed(
  () => (props.styleConfig?.colors ?? {}) as { primary?: string; text?: string },
)

const buttonStyle = computed<CSSProperties>(() => ({
  ...boxStyle.value,
  ...textStyle.value,
  backgroundColor: colors.value.primary || '#2563EB',
  color: colors.value.text || '#ffffff',
}))
</script>

<template>
  <div class="element-block">
    <a
      class="element-button"
      :href="content?.url || '#'"
      :target="content?.target === '_blank' ? '_blank' : undefined"
      :rel="content?.target === '_blank' ? 'noopener noreferrer' : undefined"
      :style="buttonStyle"
      data-field="label"
    >
      {{ content?.label || 'Klik di sini' }}
    </a>
  </div>
</template>

<style scoped>
.element-block {
  padding: 12px 16px;
}
.element-button {
  display: inline-block;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  line-height: 1.2;
}
</style>
