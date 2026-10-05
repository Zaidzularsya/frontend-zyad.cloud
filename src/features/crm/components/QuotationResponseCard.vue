<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, CheckCircle2 } from 'lucide-vue-next'

import type { Activity } from '@/features/crm/activities/api/activities.api'
import { categoryLabel } from '@/features/public-documents/utils/revision'

// Respons customer atas penawaran (link publik). Kartu dibuat kontras agar
// tidak tenggelam di antara log interaksi biasa. Catatan customer dirender
// sebagai teks (interpolasi), tidak pernah sebagai HTML.
const props = defineProps<{
  activity: Activity
  highlight: 'approved' | 'revision'
  time: string
  timeTitle: string
}>()

const categories = computed(() => {
  const raw = props.activity.metadata?.categories
  return Array.isArray(raw) ? raw.map((c) => categoryLabel(String(c))) : []
})
const note = computed(() => {
  const raw = props.activity.metadata?.note
  return typeof raw === 'string' ? raw : ''
})
const responder = computed(() => {
  const raw = props.activity.metadata?.responder_name
  return typeof raw === 'string' ? raw : ''
})
</script>

<template>
  <div
    class="rounded-lg border-l-4 p-3"
    :class="
      highlight === 'revision'
        ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40'
        : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
    "
    data-testid="quotation-response-card"
  >
    <div class="flex items-start gap-2">
      <component
        :is="highlight === 'revision' ? AlertTriangle : CheckCircle2"
        class="mt-0.5 size-4 shrink-0"
        :class="highlight === 'revision' ? 'text-amber-600' : 'text-emerald-600'"
        aria-hidden="true"
      />
      <div class="min-w-0 space-y-1.5">
        <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ activity.subject }}</p>
        <ul v-if="categories.length" class="flex flex-wrap gap-1.5" aria-label="Bagian direvisi">
          <li
            v-for="label in categories"
            :key="label"
            class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/50 dark:text-amber-100"
          >
            {{ label }}
          </li>
        </ul>
        <blockquote
          v-if="note"
          class="border-l-2 border-amber-300 pl-3 text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-200"
        >
          {{ note }}
        </blockquote>
        <p class="text-xs text-gray-500">
          <template v-if="responder">{{ responder }} · </template>
          <time :title="timeTitle">{{ time }}</time>
        </p>
      </div>
    </div>
  </div>
</template>
