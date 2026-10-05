<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  FileText,
  ListTodo,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  RotateCcw,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-vue-next'

import BaseCard from '@/components/ui/BaseCard.vue'
import { useToast } from '@/components/ui/toast'
import type { ActivityType } from '@/features/crm/activities/api/activities.api'
import { useCompleteActivityMutation } from '@/features/crm/activities/api/activities.queries'
import type {
  LeadActivityKind,
  LeadDashboardGranularity,
  LeadDashboardParams,
  LeadFollowUp,
  LeadStatus,
} from '@/features/crm/leads/api/leads.api'
import { leadKeys, useLeadDashboardQuery } from '@/features/crm/leads/api/leads.queries'
import PlaybookOutcomeDialog from '@/features/crm/components/PlaybookOutcomeDialog.vue'
import LeadGrowthChart from '@/features/crm/leads/components/LeadGrowthChart.vue'
import { stepLabel } from '@/features/crm/leads/utils/lead-playbook'
import { activityTypeLabels, feedSegments } from '@/features/crm/leads/utils/lead-activity-feed'
import {
  daysBetweenInclusive,
  defaultGranularity,
  dueLabel,
  leadRangePresets,
  parseIsoDate,
  percentDelta,
  presetRange,
  relativeTime,
  toIsoDate,
  type LeadRangePreset,
  dueToneClass,
} from '@/features/crm/leads/utils/lead-dashboard'
import { leadStatusLabels, leadStatusTone } from '@/features/crm/leads/utils/lead-status'

const emit = defineEmits<{
  'open-status': [status: LeadStatus]
  'open-lead': [id: string]
}>()

const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const toast = useToast()

// --- Range & granularity ---
const preset = ref<LeadRangePreset>('30d')
const initialCustom = presetRange('30d')
const customFrom = ref(initialCustom.from)
const customTo = ref(initialCustom.to)
// null = follow the range (≤92 days per day, longer per month).
const granularityOverride = ref<LeadDashboardGranularity | null>(null)

const range = computed(() =>
  preset.value === 'custom'
    ? { from: customFrom.value, to: customTo.value }
    : presetRange(preset.value),
)
const customRangeInvalid = computed(
  () =>
    preset.value === 'custom' &&
    (!customFrom.value || !customTo.value || customFrom.value > customTo.value),
)
const granularity = computed<LeadDashboardGranularity>(
  () => granularityOverride.value ?? defaultGranularity(range.value.from, range.value.to),
)
// Daily buckets are capped at 366 days by the API; lock to monthly beyond.
const dailyAllowed = computed(() => daysBetweenInclusive(range.value.from, range.value.to) <= 366)

function selectPreset(value: LeadRangePreset) {
  preset.value = value
  granularityOverride.value = null
}

function selectGranularity(value: LeadDashboardGranularity) {
  granularityOverride.value =
    value === defaultGranularity(range.value.from, range.value.to) ? null : value
}

// Keeps the last valid request while a custom range is half-edited, so the
// dashboard does not flash an error between the two date inputs.
const params = ref<LeadDashboardParams>({ ...range.value, granularity: granularity.value })
watch(
  [range, granularity, dailyAllowed, customRangeInvalid],
  () => {
    if (customRangeInvalid.value) return
    params.value = { ...range.value, granularity: dailyAllowed.value ? granularity.value : 'month' }
  },
  { immediate: true },
)

const dashboardQuery = useLeadDashboardQuery(params)
const dashboard = computed(() => dashboardQuery.data.value)

const rangeFormat = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const rangeLabel = computed(() => {
  const from = rangeFormat.format(parseIsoDate(params.value.from))
  const to = rangeFormat.format(parseIsoDate(params.value.to))
  return from === to ? from : `${from} – ${to}`
})

// --- Status cards ---
const cardStatuses: LeadStatus[] = ['new', 'attempting', 'contacted', 'qualified', 'converted']

function trend(current: number, previous: number) {
  const delta = percentDelta(current, previous)
  if (delta === null) {
    return current > 0
      ? { text: 'baru', tone: 'neutral' as const }
      : { text: '—', tone: 'neutral' as const }
  }
  return {
    text: `${delta >= 0 ? '+' : ''}${delta}%`,
    tone: delta > 0 ? ('up' as const) : delta < 0 ? ('down' as const) : ('neutral' as const),
  }
}

const statusCards = computed(() =>
  cardStatuses.map((status) => {
    const entered = dashboard.value?.status_entered[status] ?? { current: 0, previous: 0 }
    return {
      status,
      label: leadStatusLabels[status],
      tone: leadStatusTone[status],
      total: dashboard.value?.status_counts[status] ?? 0,
      entered: entered.current,
      trend: trend(entered.current, entered.previous),
    }
  }),
)

const trendClass = {
  up: 'text-emerald-600 dark:text-emerald-400',
  down: 'text-red-600 dark:text-red-400',
  neutral: 'text-gray-500 dark:text-gray-400',
}

// --- Growth summary ---
const createdTrend = computed(() =>
  trend(dashboard.value?.created.current ?? 0, dashboard.value?.created.previous ?? 0),
)
const convertedTrend = computed(() =>
  trend(dashboard.value?.converted.current ?? 0, dashboard.value?.converted.previous ?? 0),
)
const conversionRate = computed(() => {
  const created = dashboard.value?.created.current ?? 0
  if (created === 0) return '—'
  const rate = ((dashboard.value?.converted.current ?? 0) / created) * 100
  return `${rate.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`
})

// --- Sources ---
const sources = computed(() => {
  const rows = dashboard.value?.by_source ?? []
  const max = Math.max(1, ...rows.map((row) => row.count))
  return rows.slice(0, 6).map((row) => ({
    label: row.source ? row.source.charAt(0).toUpperCase() + row.source.slice(1) : 'Tanpa sumber',
    count: row.count,
    width: `${(row.count / max) * 100}%`,
  }))
})
const otherSourcesCount = computed(() =>
  (dashboard.value?.by_source ?? []).slice(6).reduce((sum, row) => sum + row.count, 0),
)

// --- Follow-ups ---
const activityIcons: Record<ActivityType, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: CalendarDays,
  task: ListTodo,
  note: FileText,
  whatsapp: MessageCircle,
  quotation_response: FileText,
}

const followUps = computed(() =>
  (dashboard.value?.upcoming_follow_ups ?? []).map((item) => ({
    ...item,
    due: dueLabel(item.due_at),
    icon: activityIcons[item.type] ?? ListTodo,
    typeLabel: item.playbook
      ? stepLabel(item.playbook)
      : (activityTypeLabels[item.type] ?? item.type),
  })),
)

function initials(name?: string) {
  if (!name) return '—'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

const completeMutation = useCompleteActivityMutation()
const completingId = ref<string | null>(null)

// Langkah SOP selesai lewat dialog hasil, bukan complete langsung.
const outcomeActivity = ref<LeadFollowUp | null>(null)

async function onOutcomeCompleted() {
  outcomeActivity.value = null
  await queryClient.invalidateQueries({ queryKey: leadKeys.all })
  toast.success('Hasil langkah SOP tersimpan.')
}

async function completeFollowUp(id: string) {
  completingId.value = id
  try {
    await completeMutation.mutateAsync(id)
    await queryClient.invalidateQueries({ queryKey: leadKeys.all })
    toast.success('Follow-up ditandai selesai.')
  } catch {
    toast.error('Follow-up gagal ditandai selesai. Coba lagi.')
  } finally {
    completingId.value = null
  }
}

const activitiesPath = computed(() => route.path.replace(/\/leads\/?$/, '/activities'))

// --- Recent activity ---
const feedIcons: Record<LeadActivityKind, { icon: typeof Plus; class: string }> = {
  created: { icon: Plus, class: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' },
  status_changed: {
    icon: ArrowRight,
    class: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  },
  assigned: {
    icon: UserPlus,
    class: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  },
  converted: {
    icon: CheckCircle2,
    class: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  deleted: { icon: Trash2, class: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300' },
  restored: {
    icon: RotateCcw,
    class: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  },
  playbook_started: {
    icon: ListTodo,
    class: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  },
  playbook_ended: {
    icon: CheckCircle2,
    class: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  },
  activity_created: {
    icon: ListTodo,
    class: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  },
  activity_completed: {
    icon: Check,
    class: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  },
}

const feed = computed(() =>
  (dashboard.value?.recent_activity ?? []).map((item, index) => {
    const whatsapp = item.activity_type === 'whatsapp'
    return {
      key: `${item.kind}-${item.lead_id}-${item.occurred_at}-${index}`,
      leadId: item.lead_id,
      clickable: item.kind !== 'deleted',
      segments: feedSegments(item),
      when: relativeTime(item.occurred_at),
      icon: whatsapp ? MessageCircle : feedIcons[item.kind].icon,
      iconClass: whatsapp
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
        : feedIcons[item.kind].class,
    }
  }),
)

const today = toIsoDate(new Date())
</script>

<template>
  <div class="space-y-4">
    <!-- Range toolbar -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <div
          class="inline-flex flex-wrap gap-0.5 rounded-xl bg-gray-100 p-1 dark:bg-gray-800"
          role="group"
          aria-label="Rentang waktu"
        >
          <button
            v-for="option in leadRangePresets"
            :key="option.value"
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm font-medium"
            :class="
              preset === option.value
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            "
            :aria-pressed="preset === option.value"
            @click="selectPreset(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
        <div v-if="preset === 'custom'" class="flex items-center gap-2 text-sm">
          <input
            v-model="customFrom"
            type="date"
            :max="customTo || today"
            aria-label="Dari tanggal"
            class="rounded-lg border bg-white px-2 py-1.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
          <span class="text-gray-400">–</span>
          <input
            v-model="customTo"
            type="date"
            :min="customFrom"
            :max="today"
            aria-label="Sampai tanggal"
            class="rounded-lg border bg-white px-2 py-1.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <span class="text-sm font-medium tabular-nums text-gray-700 dark:text-gray-300">
          {{ rangeLabel }}
        </span>
        <div
          class="inline-flex gap-0.5 rounded-xl bg-gray-100 p-1 dark:bg-gray-800"
          role="group"
          aria-label="Tampilan grafik"
        >
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            :class="
              params.granularity === 'day'
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            "
            :aria-pressed="params.granularity === 'day'"
            :disabled="!dailyAllowed"
            :title="dailyAllowed ? undefined : 'Tampilan harian maksimal 366 hari'"
            @click="selectGranularity('day')"
          >
            Harian
          </button>
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm font-medium"
            :class="
              params.granularity === 'month'
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            "
            :aria-pressed="params.granularity === 'month'"
            @click="selectGranularity('month')"
          >
            Bulanan
          </button>
        </div>
      </div>
    </div>
    <p v-if="customRangeInvalid" class="text-sm text-red-600">
      Tanggal awal harus sebelum atau sama dengan tanggal akhir.
    </p>

    <BaseCard v-if="dashboardQuery.isError.value" class="text-center">
      <p class="font-semibold text-red-700 dark:text-red-400">Data dashboard tidak dapat dimuat.</p>
      <button class="mt-2 text-sm font-medium text-brand-600" @click="dashboardQuery.refetch()">
        Coba lagi
      </button>
    </BaseCard>

    <template v-else>
      <!-- Status cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <button
          v-for="card in statusCards"
          :key="card.status"
          type="button"
          class="group flex flex-col justify-start rounded-2xl border bg-white p-4 text-left shadow-sm transition-colors hover:border-brand-400 focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none dark:bg-gray-900 dark:hover:border-brand-400 dark:focus-visible:ring-brand-900"
          :aria-label="`Lihat lead berstatus ${card.label}`"
          @click="emit('open-status', card.status)"
        >
          <div class="flex items-center gap-3">
            <span class="grid size-11 shrink-0 place-items-center rounded-2xl" :class="card.tone">
              <Users class="size-5" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ card.label }}</p>
              <p class="text-2xl font-bold tabular-nums">
                <span v-if="dashboardQuery.isPending.value" class="text-gray-300">–</span>
                <template v-else>{{ card.total.toLocaleString('id-ID') }}</template>
              </p>
            </div>
            <ArrowRight
              class="size-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500"
            />
          </div>
          <p
            class="mt-3 flex items-center gap-x-2 text-xs whitespace-nowrap text-gray-500 dark:text-gray-400"
          >
            <span
              class="inline-flex items-center gap-1 font-semibold"
              :class="trendClass[card.trend.tone]"
            >
              <TrendingUp v-if="card.trend.tone === 'up'" class="size-3.5" />
              <TrendingDown v-else-if="card.trend.tone === 'down'" class="size-3.5" />
              {{ card.trend.text }}
            </span>
            <span
              class="tabular-nums"
              :title="`${card.entered} lead masuk ke status ${card.label} di periode ini`"
            >
              {{ card.entered }} masuk
            </span>
          </p>
        </button>
      </div>

      <!-- Growth chart + sources -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BaseCard class="min-w-0 !p-0 lg:col-span-2">
          <div class="flex flex-wrap items-start justify-between gap-4 px-5 pt-5">
            <div>
              <h2 class="text-base font-semibold">Pertumbuhan lead</h2>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ params.granularity === 'day' ? 'Per hari' : 'Per bulan' }} · dibandingkan dengan
                periode sebelumnya
              </p>
            </div>
            <dl class="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div>
                <dt class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <span class="size-2.5 rounded-sm bg-brand-500 dark:bg-sky-400" />Lead masuk
                </dt>
                <dd class="flex items-baseline gap-1.5">
                  <span class="text-lg font-bold tabular-nums">{{
                    dashboard?.created.current ?? 0
                  }}</span>
                  <span class="text-xs font-semibold" :class="trendClass[createdTrend.tone]">
                    {{ createdTrend.text }}
                  </span>
                </dd>
              </div>
              <div>
                <dt class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <span class="size-2.5 rounded-sm bg-teal-600 dark:bg-teal-400" />Converted
                </dt>
                <dd class="flex items-baseline gap-1.5">
                  <span class="text-lg font-bold tabular-nums">{{
                    dashboard?.converted.current ?? 0
                  }}</span>
                  <span class="text-xs font-semibold" :class="trendClass[convertedTrend.tone]">
                    {{ convertedTrend.text }}
                  </span>
                </dd>
              </div>
              <div>
                <dt class="text-xs text-gray-500 dark:text-gray-400">Conversion rate</dt>
                <dd class="text-lg font-bold tabular-nums">{{ conversionRate }}</dd>
              </div>
            </dl>
          </div>
          <div class="min-h-[316px] px-2 pb-2">
            <div
              v-if="dashboardQuery.isPending.value"
              class="grid h-[300px] place-items-center text-sm text-gray-500"
            >
              Memuat grafik...
            </div>
            <LeadGrowthChart
              v-else-if="dashboard"
              :series="dashboard.series"
              :granularity="dashboard.range.granularity"
            />
          </div>
        </BaseCard>

        <BaseCard>
          <h2 class="text-base font-semibold">Sumber lead</h2>
          <p class="text-xs text-gray-500 dark:text-gray-400">Lead masuk di periode ini</p>
          <p v-if="sources.length === 0" class="py-10 text-center text-sm text-gray-500">
            Belum ada lead di periode ini.
          </p>
          <ul v-else class="mt-4 space-y-3">
            <li
              v-for="source in sources"
              :key="source.label"
              class="grid grid-cols-[104px_minmax(0,1fr)_40px] items-center gap-3 text-sm"
            >
              <span class="truncate text-gray-600 dark:text-gray-300" :title="source.label">
                {{ source.label }}
              </span>
              <span class="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <span
                  class="block h-full rounded-r bg-brand-500 dark:bg-sky-400"
                  :style="{ width: source.width }"
                />
              </span>
              <span class="text-right font-semibold tabular-nums">{{ source.count }}</span>
            </li>
            <li
              v-if="otherSourcesCount > 0"
              class="grid grid-cols-[104px_minmax(0,1fr)_40px] gap-3 text-sm text-gray-500"
            >
              <span>Lainnya</span><span /><span class="text-right tabular-nums">{{
                otherSourcesCount
              }}</span>
            </li>
          </ul>
          <div
            v-if="sources.length > 0"
            class="mt-4 flex justify-between border-t pt-3 text-xs text-gray-500 dark:text-gray-400"
          >
            <span>Total</span>
            <span class="tabular-nums">{{ dashboard?.created.current ?? 0 }}</span>
          </div>
        </BaseCard>
      </div>

      <!-- Follow-ups + recent activity -->
      <div class="grid grid-cols-1 gap-4 2xl:grid-cols-5">
        <BaseCard class="!p-0 min-w-0 2xl:col-span-3">
          <div class="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
            <div>
              <h2 class="text-base font-semibold">Follow-up terdekat</h2>
              <p class="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span class="tabular-nums"
                  >{{ dashboard?.follow_up_summary.pending ?? 0 }} pending</span
                >
                <span
                  v-if="(dashboard?.follow_up_summary.overdue ?? 0) > 0"
                  class="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300"
                >
                  <span class="size-1.5 rounded-full bg-current" />
                  {{ dashboard?.follow_up_summary.overdue }} terlambat
                </span>
                <span
                  v-if="(dashboard?.follow_up_summary.due_today ?? 0) > 0"
                  class="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                >
                  {{ dashboard?.follow_up_summary.due_today }} hari ini
                </span>
              </p>
            </div>
            <button
              type="button"
              class="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
              @click="router.push(activitiesPath)"
            >
              Lihat semua activity →
            </button>
          </div>
          <p
            v-if="!dashboardQuery.isPending.value && followUps.length === 0"
            class="p-10 text-center text-sm text-gray-500"
          >
            Tidak ada follow-up yang menunggu.
          </p>
          <div v-else class="mt-3 overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-gray-50 text-xs text-gray-500 uppercase dark:bg-gray-800/60">
                <tr>
                  <th class="px-5 py-2.5 font-semibold">Jatuh tempo</th>
                  <th class="px-5 py-2.5 font-semibold">Lead</th>
                  <th class="px-5 py-2.5 font-semibold">Aktivitas</th>
                  <th class="px-5 py-2.5 font-semibold">PIC</th>
                  <th class="px-5 py-2.5"><span class="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in followUps" :key="item.id" class="border-t">
                  <td
                    class="px-5 py-3 whitespace-nowrap font-semibold"
                    :class="dueToneClass[item.due.tone]"
                  >
                    {{ item.due.text }}
                  </td>
                  <td class="px-5 py-3">
                    <button
                      type="button"
                      class="text-left font-medium whitespace-nowrap hover:text-brand-600 hover:underline"
                      @click="emit('open-lead', item.related_entity_id)"
                    >
                      {{ item.lead_name }}
                    </button>
                    <p v-if="item.company_name" class="text-xs text-gray-500">
                      {{ item.company_name }}
                    </p>
                  </td>
                  <td class="px-5 py-3">
                    <span
                      class="inline-flex items-center gap-1.5 whitespace-nowrap text-gray-700 dark:text-gray-300"
                    >
                      <component :is="item.icon" class="size-4 text-gray-400" />
                      {{ item.typeLabel }}
                    </span>
                    <p class="max-w-56 truncate text-xs text-gray-500" :title="item.subject">
                      {{ item.subject }}
                    </p>
                  </td>
                  <td class="px-5 py-3">
                    <span
                      class="grid size-7 place-items-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700 dark:bg-sky-950/50 dark:text-sky-300"
                      :title="item.assignee_name || 'Belum ada PIC'"
                    >
                      {{ initials(item.assignee_name) }}
                    </span>
                  </td>
                  <td class="px-5 py-3 text-right">
                    <button
                      type="button"
                      class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                      :disabled="completingId === item.id"
                      @click="item.playbook ? (outcomeActivity = item) : completeFollowUp(item.id)"
                    >
                      <Check class="size-3.5" />
                      {{ completingId === item.id ? 'Menyimpan...' : 'Selesai' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </BaseCard>

        <BaseCard class="min-w-0 2xl:col-span-2">
          <h2 class="text-base font-semibold">Aktivitas terbaru</h2>
          <p class="text-xs text-gray-500 dark:text-gray-400">Semua lead</p>
          <p
            v-if="!dashboardQuery.isPending.value && feed.length === 0"
            class="py-10 text-center text-sm text-gray-500"
          >
            Belum ada aktivitas.
          </p>
          <ol v-else class="mt-3">
            <li
              v-for="(item, index) in feed"
              :key="item.key"
              class="relative grid grid-cols-[32px_minmax(0,1fr)] gap-3 py-2.5"
            >
              <span
                v-if="index < feed.length - 1"
                class="absolute top-11 bottom-0 left-[15px] w-0.5 bg-gray-100 dark:bg-gray-800"
                aria-hidden="true"
              />
              <span class="grid size-8 place-items-center rounded-full" :class="item.iconClass">
                <component :is="item.icon" class="size-4" />
              </span>
              <div class="min-w-0">
                <p class="text-sm text-gray-600 dark:text-gray-300">
                  <template v-for="(segment, segmentIndex) in item.segments" :key="segmentIndex">
                    <strong
                      v-if="segment.strong"
                      class="font-semibold text-gray-900 dark:text-white"
                    >
                      {{ segment.text }}
                    </strong>
                    <template v-else>{{ segment.text }}</template>
                  </template>
                </p>
                <div class="flex items-center gap-2 text-xs text-gray-400">
                  <time>{{ item.when }}</time>
                  <button
                    v-if="item.clickable"
                    type="button"
                    class="font-medium text-brand-600 hover:underline dark:text-brand-400"
                    @click="emit('open-lead', item.leadId)"
                  >
                    Buka lead
                  </button>
                </div>
              </div>
            </li>
          </ol>
        </BaseCard>
      </div>
    </template>

    <PlaybookOutcomeDialog
      :activity="outcomeActivity"
      @close="outcomeActivity = null"
      @completed="onOutcomeCompleted"
    />
  </div>
</template>
