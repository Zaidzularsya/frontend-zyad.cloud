<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  sectionType: string
  name: string
  content: Record<string, unknown>
  renderer?: string
}>()

const title = computed(() => pickText('title', 'titleHtml', 'heading') || props.name)
const description = computed(() => pickText('description', 'subtitle', 'desc'))
const badge = computed(() => pickText('badge', 'eyebrow') || props.sectionType)

const cards = computed(() => {
  const source =
    props.content.services ?? props.content.benefits ?? props.content.cards ?? props.content.items
  return Array.isArray(source) ? source.slice(0, 3) : []
})

function pickText(...keys: string[]) {
  for (const key of keys) {
    const value = props.content[key]
    if (typeof value === 'string' && value.trim()) return stripHtml(value)
  }
  return ''
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, '')
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border bg-white dark:border-gray-800 dark:bg-gray-950">
    <div
      class="relative min-h-36 bg-gradient-to-br from-slate-950 via-slate-900 to-brand-900 p-4 text-white"
    >
      <div class="absolute right-3 top-3 h-14 w-14 rounded-full bg-white/10 blur-xl"></div>
      <div class="relative flex items-center justify-between gap-2">
        <span
          class="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
        >
          {{ badge }}
        </span>
        <span class="rounded-full bg-white/10 px-2 py-1 text-[10px]">
          {{ renderer || 'No renderer' }}
        </span>
      </div>

      <div class="relative mt-5 max-w-[80%]">
        <p class="line-clamp-2 text-sm font-bold leading-tight">{{ title }}</p>
        <p v-if="description" class="mt-2 line-clamp-2 text-[11px] leading-relaxed text-white/70">
          {{ description }}
        </p>
      </div>

      <div v-if="sectionType === 'hero'" class="relative mt-4 flex gap-2">
        <span class="h-5 w-20 rounded-full bg-white"></span>
        <span class="h-5 w-16 rounded-full border border-white/50"></span>
      </div>

      <div v-else-if="sectionType === 'faq'" class="relative mt-4 space-y-1.5">
        <span v-for="index in 3" :key="index" class="block h-4 rounded bg-white/15"></span>
      </div>

      <div v-else-if="sectionType === 'footer'" class="relative mt-5 grid grid-cols-4 gap-2">
        <span v-for="index in 4" :key="index" class="h-8 rounded bg-white/15"></span>
      </div>

      <div v-else class="relative mt-4 grid grid-cols-3 gap-2">
        <span
          v-for="(_, index) in cards.length ? cards : [1, 2, 3]"
          :key="index"
          class="h-10 rounded bg-white/15"
        ></span>
      </div>
    </div>
  </div>
</template>
