<script setup lang="ts">
import { computed, watch } from 'vue'

import DealStageTrack from '@/features/crm/components/DealStageTrack.vue'
import { startableStages } from '@/features/crm/deals/utils/deal-stage-track'
import { activePipelines, type DealForm } from '@/features/crm/leads/utils/convert-form'
import type { Pipeline } from '@/features/crm/pipelines/api/pipelines.api'

const props = defineProps<{ pipelines: Pipeline[]; members: { user_id: string; name: string }[] }>()
const form = defineModel<DealForm>({ required: true })

const options = computed(() => activePipelines(props.pipelines))
const pipeline = computed(() => options.value.find((p) => p.id === form.value.pipelineId))
const stages = computed(() => (pipeline.value ? startableStages(pipeline.value.stages) : []))

// Ganti pipeline → stage kembali ke stage awal pipeline tersebut.
watch(
  () => form.value.pipelineId,
  () => {
    if (!stages.value.some((s) => s.id === form.value.stageId))
      form.value.stageId = stages.value[0]?.id ?? ''
  },
)

const field = 'w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950'
</script>

<template>
  <div class="space-y-3">
    <div class="grid gap-3 sm:grid-cols-2">
      <label v-if="options.length > 1" class="space-y-1 text-xs text-gray-500">
        Pipeline
        <select v-model="form.pipelineId" name="deal-pipeline" :class="field">
          <option v-for="p in options" :key="p.id" :value="p.id">
            {{ p.name }}{{ p.is_default ? ' (default)' : '' }}
          </option>
        </select>
      </label>
      <label class="space-y-1 text-xs text-gray-500">
        Mulai di stage
        <select v-model="form.stageId" name="deal-stage" :class="field">
          <option v-for="s in stages" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </label>
    </div>

    <div v-if="pipeline" class="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
      <p class="mb-2 text-xs text-gray-500">Jalur yang akan dilalui deal · {{ pipeline.name }}</p>
      <DealStageTrack :stages="pipeline.stages" :current-stage-id="form.stageId || null" />
    </div>

    <label class="block space-y-1 text-xs text-gray-500">
      Judul deal
      <input v-model="form.title" name="deal-title" maxlength="200" :class="field" />
    </label>
    <div class="grid gap-3 sm:grid-cols-2">
      <label class="space-y-1 text-xs text-gray-500">
        Nilai (Rp)
        <input
          v-model="form.value"
          name="deal-value"
          inputmode="decimal"
          placeholder="15.000.000"
          :class="field"
        />
      </label>
      <label class="space-y-1 text-xs text-gray-500">
        Target closing
        <input v-model="form.expectedCloseDate" name="deal-close" type="date" :class="field" />
      </label>
    </div>
    <label class="block space-y-1 text-xs text-gray-500">
      Kebutuhan
      <textarea v-model="form.description" name="deal-description" rows="2" :class="field" />
    </label>
    <div class="grid gap-3 sm:grid-cols-2">
      <label class="space-y-1 text-xs text-gray-500">
        Pengambil keputusan
        <input
          v-model="form.decisionMaker"
          name="deal-decision-maker"
          maxlength="150"
          :class="field"
        />
      </label>
      <label class="space-y-1 text-xs text-gray-500">
        Owner
        <select v-model="form.ownerUserId" name="deal-owner" :class="field">
          <option value="">Saya</option>
          <option v-for="m in members" :key="m.user_id" :value="m.user_id">{{ m.name }}</option>
        </select>
      </label>
    </div>
  </div>
</template>
