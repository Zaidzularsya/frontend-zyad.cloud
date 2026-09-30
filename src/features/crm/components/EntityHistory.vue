<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ArrowRightLeft,
  CalendarDays,
  FileText,
  ListTodo,
  Mail,
  MessageCircle,
  Phone,
  Search,
} from 'lucide-vue-next'

import type { ActivityType } from '@/features/crm/activities/api/activities.api'
import {
  filterHistory,
  type HistoryFilter,
  type HistoryItem,
} from '@/features/crm/components/entity-history'
import { relativeTime } from '@/features/crm/leads/utils/lead-dashboard'
import { activityTypeLabels, feedSegments } from '@/features/crm/leads/utils/lead-activity-feed'
import { outcomeLabels } from '@/features/crm/leads/utils/lead-playbook'

// Riwayat gabungan: activity yang sudah terjadi + perubahan lead (event).
const props = defineProps<{ items: HistoryItem[]; leadName?: string }>()
const emit = defineEmits<{ 'open-channel': [channel: 'whatsapp' | 'email'] }>()

const filters: { value: HistoryFilter; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'interaction', label: 'Interaksi' },
  { value: 'note', label: 'Catatan' },
  { value: 'change', label: 'Perubahan' },
]
const filter = ref<HistoryFilter>('all')
const keyword = ref('')

const icons: Record<ActivityType, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: CalendarDays,
  task: ListTodo,
  note: FileText,
  whatsapp: MessageCircle,
}

const absoluteFormat = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Jakarta',
})

const visible = computed(() => filterHistory(props.items, filter.value, keyword.value))

function absolute(value: string) {
  return `${absoluteFormat.format(new Date(value))} WIB`
}

function eventSentence(item: HistoryItem) {
  const e = item.event
  if (!e) return []
  return feedSegments({
    kind: e.event_type,
    occurred_at: e.created_at,
    lead_id: e.lead_id,
    lead_name: props.leadName || 'lead ini',
    actor_user_id: e.actor_user_id,
    actor_name: e.actor_name,
    from_value: e.from_value,
    to_value: e.to_value,
    from_name: e.from_name,
    to_name: e.to_name,
  })
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center gap-2">
      <div class="flex flex-wrap gap-1" role="group" aria-label="Filter riwayat">
        <button
          v-for="chip in filters"
          :key="chip.value"
          type="button"
          class="rounded-full border px-3 py-1 text-xs font-medium"
          :class="
            filter === chip.value
              ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
              : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-900'
          "
          :aria-pressed="filter === chip.value"
          @click="filter = chip.value"
        >
          {{ chip.label }}
        </button>
      </div>
      <label class="relative ml-auto block min-w-40 flex-1 sm:max-w-64">
        <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="keyword"
          type="search"
          aria-label="Cari riwayat"
          placeholder="Cari riwayat..."
          class="w-full rounded-lg border bg-white py-1.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
        />
      </label>
    </div>

    <p v-if="!visible.length" class="py-4 text-sm text-gray-500">Belum ada riwayat.</p>
    <ul v-else class="space-y-3 border-l pl-4">
      <li v-for="item in visible" :key="item.key" class="relative">
        <span
          class="absolute -left-[26px] top-0.5 grid size-5 place-items-center rounded-full border bg-white text-gray-500 dark:bg-gray-950"
        >
          <component
            :is="item.activity ? (icons[item.activity.type] ?? ListTodo) : ArrowRightLeft"
            class="size-3"
          />
        </span>

        <template v-if="item.activity">
          <p class="text-xs text-gray-500">
            {{ activityTypeLabels[item.activity.type] ?? item.activity.type }} ·
            <time :datetime="item.at" :title="absolute(item.at)">{{ relativeTime(item.at) }}</time>
            <template v-if="item.activity.status === 'cancelled'"> · dibatalkan</template>
          </p>
          <p class="font-medium">{{ item.activity.subject }}</p>
          <p v-if="item.activity.outcome_key" class="text-sm text-gray-600 dark:text-gray-300">
            Hasil: {{ outcomeLabels[item.activity.outcome_key] ?? item.activity.outcome_key }}
          </p>
          <p v-if="item.activity.description" class="text-sm text-gray-500">
            {{ item.activity.description }}
          </p>
          <button
            v-if="item.activity.type === 'whatsapp' || item.activity.type === 'email'"
            type="button"
            class="mt-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
            @click="emit('open-channel', item.activity.type as 'whatsapp' | 'email')"
          >
            {{ item.activity.type === 'whatsapp' ? 'Buka chat' : 'Buka email' }}
          </button>
        </template>

        <template v-else>
          <p class="text-sm">
            <template v-for="(segment, index) in eventSentence(item)" :key="index">
              <strong v-if="segment.strong">{{ segment.text }}</strong>
              <template v-else>{{ segment.text }}</template>
            </template>
          </p>
          <p class="text-xs text-gray-500">
            <time :datetime="item.at" :title="absolute(item.at)">{{ relativeTime(item.at) }}</time>
          </p>
        </template>
      </li>
    </ul>
  </div>
</template>
