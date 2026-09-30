<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Mail,
  MessageCircle,
  Phone,
  PlayCircle,
} from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import type {
  Activity,
  ChannelAction,
  CompleteActivityResult,
} from '@/features/crm/activities/api/activities.api'
import PlaybookOutcomeDialog from '@/features/crm/components/PlaybookOutcomeDialog.vue'
import type { Lead } from '@/features/crm/leads/api/leads.api'
import { useStartLeadPlaybookMutation } from '@/features/crm/leads/api/leads.queries'
import { dueLabel } from '@/features/crm/leads/utils/lead-dashboard'
import {
  channelActionLabels,
  disqualifyReasonLabels,
  stepLabel,
} from '@/features/crm/leads/utils/lead-playbook'
import { leadStatusLabels } from '@/features/crm/leads/utils/lead-status'
import { useCrmSettingsQuery } from '@/features/crm/settings/api/crm-settings.queries'

const props = defineProps<{ lead: Lead; step: Activity | null; readonly?: boolean }>()
const emit = defineEmits<{ channel: [action: ChannelAction]; qualified: [] }>()

const settings = useCrmSettingsQuery()
const startMutation = useStartLeadPlaybookMutation()
const dialogActivity = ref<Activity | null>(null)
const startError = ref('')

const icons: Record<ChannelAction, typeof Phone> = {
  whatsapp: MessageCircle,
  email: Mail,
  call: Phone,
  schedule_meeting: CalendarDays,
  requirements_form: ClipboardList,
}
const stepper = [
  { key: 'first_contact', label: 'Kontak pertama' },
  { key: 'discovery', label: 'Gali kebutuhan' },
  { key: 'qualified', label: 'Qualified' },
]

const enabled = computed(() => settings.data.value?.lead_playbook_enabled ?? true)
const run = computed(() => props.lead.playbook_run ?? null)
const terminal = computed(() => ['converted', 'unqualified'].includes(props.lead.status))
const canStart = computed(
  () =>
    enabled.value &&
    !props.readonly &&
    !terminal.value &&
    props.lead.status !== 'qualified' &&
    run.value?.status !== 'active',
)
const due = computed(() => dueLabel(props.step?.due_at))
const activeIndex = computed(() => {
  if (props.lead.status === 'qualified' || props.lead.status === 'converted') return 2
  return stepper.findIndex((s) => s.key === props.step?.playbook?.step_key)
})
const resultText = computed(() => {
  if (!run.value || run.value.status === 'active') return ''
  if (props.lead.status === 'unqualified') {
    const reason = props.lead.disqualify_reason as keyof typeof disqualifyReasonLabels | undefined
    return `Unqualified${reason ? ` — ${disqualifyReasonLabels[reason]}` : ''}`
  }
  return leadStatusLabels[props.lead.status]
})

function actionDisabled(action: ChannelAction) {
  if (props.readonly) return true
  if (action === 'email') return !props.lead.email
  if (action === 'call' || action === 'whatsapp') return !props.lead.phone
  return false
}

async function start() {
  startError.value = ''
  try {
    await startMutation.mutateAsync(props.lead.id)
  } catch {
    startError.value = 'SOP gagal dimulai. Coba lagi.'
  }
}

function onCompleted(result: CompleteActivityResult) {
  dialogActivity.value = null
  if (result.lead?.status === 'qualified') emit('qualified')
}
</script>

<template>
  <section v-if="enabled || run" class="rounded-xl border p-4" aria-label="Langkah SOP berikutnya">
    <ol class="mb-3 flex items-center gap-2 text-xs text-gray-500">
      <li
        v-for="(s, i) in stepper"
        :key="s.key"
        class="flex items-center gap-2"
        :class="i <= activeIndex ? 'font-semibold text-brand-600 dark:text-brand-400' : ''"
      >
        <span class="grid size-5 place-items-center rounded-full border text-[10px]">{{
          i + 1
        }}</span>
        {{ s.label }}
        <span v-if="i < stepper.length - 1" class="text-gray-300">→</span>
      </li>
    </ol>

    <template v-if="step?.playbook">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs text-gray-500">Langkah SOP berikutnya</p>
          <p class="font-semibold">{{ stepLabel(step.playbook) }}</p>
          <p
            class="text-sm"
            :class="{
              'text-red-600': due.tone === 'overdue',
              'text-amber-600': due.tone === 'today',
            }"
          >
            {{ due.text }}
          </p>
        </div>
        <BaseButton v-if="!readonly" data-test="complete-step" @click="dialogActivity = step">
          <CheckCircle2 class="size-4" /> Selesaikan…
        </BaseButton>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        <BaseButton
          v-for="action in step.playbook.channel_actions"
          :key="action"
          :data-test="`channel-${action}`"
          variant="outline"
          :disabled="actionDisabled(action)"
          :title="actionDisabled(action) ? 'Data kontak lead belum lengkap' : undefined"
          @click="emit('channel', action)"
        >
          <component :is="icons[action]" class="size-4" /> {{ channelActionLabels[action] }}
        </BaseButton>
      </div>
    </template>

    <div v-else-if="run && run.status !== 'active'" class="text-sm">
      <p class="font-semibold">SOP selesai · {{ resultText }}</p>
    </div>

    <div v-if="canStart && !step" class="mt-2 flex items-center justify-between gap-3">
      <p class="text-sm text-gray-500">Lead ini belum mengikuti SOP penanganan.</p>
      <BaseButton data-test="start-sop" :disabled="startMutation.isPending.value" @click="start">
        <PlayCircle class="size-4" /> Mulai SOP
      </BaseButton>
    </div>
    <p v-if="startError" class="mt-2 text-sm text-red-600" role="alert">{{ startError }}</p>

    <PlaybookOutcomeDialog
      :activity="dialogActivity"
      @close="dialogActivity = null"
      @completed="onCompleted"
    />
  </section>
</template>
