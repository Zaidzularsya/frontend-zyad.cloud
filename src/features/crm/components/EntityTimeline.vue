<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, X } from 'lucide-vue-next'

import type { ActivityEntityType } from '@/features/crm/activities/api/activities.api'
import {
  useActivitiesQuery,
  useCancelActivityMutation,
  useCompleteActivityMutation,
} from '@/features/crm/activities/api/activities.queries'
import ActivityQuickActions from '@/features/crm/components/ActivityQuickActions.vue'
import EntityHistory from '@/features/crm/components/EntityHistory.vue'
import { mergeHistory, splitActivities } from '@/features/crm/components/entity-history'
import type { LeadEvent } from '@/features/crm/leads/api/leads.api'
import { dueLabel } from '@/features/crm/leads/utils/lead-dashboard'

// Timeline generik per entity: slot #header (kartu SOP lead), aksi cepat,
// follow-up lain, dan riwayat gabungan (activity selesai + event lead).
const props = defineProps<{
  relatedEntityType: ActivityEntityType
  relatedEntityId: string
  readonly?: boolean
  events?: LeadEvent[]
  leadName?: string
  defaultAssigneeId?: string
}>()
const emit = defineEmits<{ 'open-channel': [channel: 'whatsapp' | 'email'] }>()

const params = computed(() => ({
  page: 1,
  per_page: 100,
  related_entity_type: props.relatedEntityType,
  related_entity_id: props.relatedEntityId,
}))
const query = useActivitiesQuery(params)
const split = computed(() => splitActivities(query.data.value?.data ?? []))
const history = computed(() => mergeHistory(query.data.value?.data ?? [], props.events ?? []))
const completeMutation = useCompleteActivityMutation()
const cancelMutation = useCancelActivityMutation()
const quick = ref<InstanceType<typeof ActivityQuickActions> | null>(null)

defineExpose({
  openComposer: (kind: 'note' | 'log' | 'followup') => quick.value?.open(kind),
  playbookStep: computed(() => split.value.playbookStep),
})
</script>

<template>
  <div class="space-y-4">
    <slot name="header" :playbook-step="split.playbookStep" />
    <ActivityQuickActions
      v-if="!readonly"
      ref="quick"
      :related-entity-type="relatedEntityType"
      :related-entity-id="relatedEntityId"
      :default-assignee-id="defaultAssigneeId"
    />
    <div v-if="query.isPending.value" class="py-8 text-center text-sm text-gray-500">
      Memuat activity...
    </div>
    <div v-else-if="query.isError.value" class="py-8 text-center text-sm text-red-700">
      Activity tidak dapat dimuat.
    </div>
    <template v-else>
      <section v-if="split.otherPending.length">
        <h2 class="mb-2 font-semibold">Follow-up lain</h2>
        <ul class="space-y-2">
          <li
            v-for="a in split.otherPending"
            :key="a.id"
            class="flex items-start justify-between gap-3 rounded-xl border p-3"
          >
            <div class="min-w-0">
              <p class="font-medium">{{ a.subject }}</p>
              <p class="text-xs text-gray-500">{{ dueLabel(a.due_at).text }}</p>
            </div>
            <div v-if="!readonly" class="flex shrink-0 gap-1">
              <button
                class="grid size-8 place-items-center rounded-lg text-emerald-600 hover:bg-emerald-50"
                aria-label="Tandai selesai"
                @click="completeMutation.mutate(a.id)"
              >
                <Check class="size-4" />
              </button>
              <button
                class="grid size-8 place-items-center rounded-lg text-red-600 hover:bg-red-50"
                aria-label="Batalkan"
                @click="cancelMutation.mutate(a.id)"
              >
                <X class="size-4" />
              </button>
            </div>
          </li>
        </ul>
      </section>
      <section>
        <h2 class="mb-2 font-semibold">Riwayat</h2>
        <EntityHistory
          :items="history"
          :lead-name="leadName"
          @open-channel="emit('open-channel', $event)"
        />
      </section>
    </template>
  </div>
</template>
