<script setup lang="ts">
import { computed } from 'vue'

import type { SessionStatus } from '@/features/whatsapp/types'
import { sessionStatusMeta, type StatusTone } from '@/features/whatsapp/utils/session-status'

const props = defineProps<{ status: SessionStatus }>()

const meta = computed(() => sessionStatusMeta(props.status))

// Badge carries real connection state, the one thing users scan this list
// for; tones follow the existing success/warning/danger colors of the app.
const toneClasses: Record<StatusTone, string> = {
  success: 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  warning: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  danger: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
}
</script>

<template>
  <span
    class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
    :class="toneClasses[meta.tone]"
  >
    {{ meta.label }}
  </span>
</template>
