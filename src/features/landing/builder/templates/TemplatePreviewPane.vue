<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { ArrowLeft } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import type { PageTemplateSummary } from '@/features/landing/shared/types/page-template.types'

const DEVICES = [
  { key: 'desktop', label: 'Desktop', width: 1280 },
  { key: 'tablet', label: 'Tablet', width: 768 },
  { key: 'mobile', label: 'Mobile', width: 375 },
] as const

const props = withDefaults(
  defineProps<{
    template: PageTemplateSummary
    /** '' = tanpa tombol aksi (mis. preview di halaman kelola). */
    actionLabel?: string
    busy?: boolean
  }>(),
  { actionLabel: 'Gunakan template ini', busy: false },
)

defineEmits<{ back: []; use: [template: PageTemplateSummary] }>()

const device = ref<(typeof DEVICES)[number]['key']>('desktop')
const viewportEl = useTemplateRef<HTMLElement>('viewportEl')
const viewportWidth = ref(0)
const viewportHeight = ref(0)

const current = computed(() => DEVICES.find((d) => d.key === device.value)!)
const scale = computed(() =>
  viewportWidth.value > 0 ? Math.min(1, viewportWidth.value / current.value.width) : 1,
)
const frameStyle = computed(() => ({
  width: `${current.value.width}px`,
  height: `${Math.round((viewportHeight.value || 640) / scale.value)}px`,
  transform: `translateX(-50%) scale(${scale.value})`,
}))
const src = computed(() => `/landing-template-preview/${props.template.id}`)

let resize: ResizeObserver | null = null
function measure() {
  viewportWidth.value = viewportEl.value?.clientWidth ?? 0
  viewportHeight.value = viewportEl.value?.clientHeight ?? 0
}
onMounted(() => {
  measure()
  if (typeof ResizeObserver === 'function' && viewportEl.value) {
    resize = new ResizeObserver(measure)
    resize.observe(viewportEl.value)
  }
})
onBeforeUnmount(() => resize?.disconnect())
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-3">
      <BaseButton variant="secondary" @click="$emit('back')">
        <ArrowLeft class="size-4" aria-hidden="true" />
        Kembali
      </BaseButton>
      <h4 class="min-w-0 flex-1 truncate font-semibold text-gray-900 dark:text-gray-100">
        {{ template.name }}
      </h4>
      <div
        class="inline-flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-700"
        role="group"
        aria-label="Perangkat preview"
      >
        <button
          v-for="d in DEVICES"
          :key="d.key"
          type="button"
          class="rounded-md px-3 py-1.5 text-sm font-medium transition"
          :class="
            device === d.key
              ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
          "
          :aria-pressed="device === d.key"
          @click="device = d.key"
        >
          {{ d.label }}
        </button>
      </div>
      <BaseButton v-if="actionLabel" :disabled="busy" @click="$emit('use', template)">
        {{ actionLabel }}
      </BaseButton>
    </div>

    <div
      ref="viewportEl"
      class="relative h-[62vh] overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800"
    >
      <iframe
        :key="`${template.id}-${device}`"
        :src="src"
        :title="template.name"
        class="absolute top-0 left-1/2 origin-top border-0 bg-white"
        :style="frameStyle"
      ></iframe>
    </div>
  </div>
</template>
