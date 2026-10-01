<script setup lang="ts">
import { computed } from 'vue'

import type { DealStatus } from '@/features/crm/deals/api/deals.api'
import { buildStageTrack, type StageNodeState } from '@/features/crm/deals/utils/deal-stage-track'
import type { PipelineStage } from '@/features/crm/pipelines/api/pipelines.api'

const props = defineProps<{
  stages: PipelineStage[]
  currentStageId: string | null
  dealStatus?: DealStatus
  clickable?: boolean
}>()
const emit = defineEmits<{ select: [stageId: string] }>()

const nodes = computed(() => buildStageTrack(props.stages, props.currentStageId, props.dealStatus))

const dotClass: Record<StageNodeState, string> = {
  done: 'border-brand-600 bg-brand-600',
  current: 'border-brand-600 bg-white ring-4 ring-brand-100 dark:bg-gray-950 dark:ring-brand-900',
  upcoming: 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-950',
  won: 'border-emerald-500 bg-white dark:bg-gray-950',
  lost: 'border-red-400 bg-white dark:bg-gray-950',
}
</script>

<template>
  <ol class="flex w-full items-start" aria-label="Tahapan deal">
    <li
      v-for="(node, index) in nodes"
      :key="node.id"
      class="relative flex-1 text-center text-[11px] leading-tight"
      :class="
        node.state === 'current'
          ? 'font-semibold text-brand-700 dark:text-brand-300'
          : 'text-gray-500'
      "
      :aria-current="node.state === 'current' ? 'step' : undefined"
    >
      <span
        v-if="index < nodes.length - 1"
        class="absolute left-1/2 top-[7px] h-0.5 w-full bg-gray-200 dark:bg-gray-700"
        aria-hidden="true"
      />
      <component
        :is="clickable && node.state !== 'won' && node.state !== 'lost' ? 'button' : 'span'"
        type="button"
        class="relative mx-auto mb-1 block size-4 rounded-full border-2"
        :class="dotClass[node.state]"
        :aria-label="clickable ? `Pindah ke ${node.name}` : undefined"
        @click="
          clickable && node.state !== 'won' && node.state !== 'lost' && emit('select', node.id)
        "
      />
      {{ node.name }}
    </li>
  </ol>
</template>
