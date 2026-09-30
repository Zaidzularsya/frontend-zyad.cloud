<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Magnet,
  Pencil,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import DataPagination from '@/components/ui/DataPagination.vue'
import { useToast } from '@/components/ui/toast'
import type {
  Lead,
  LeadListParams,
  LeadSort,
  LeadSortKey,
  LeadStatus,
} from '@/features/crm/leads/api/leads.api'
import {
  useAssignLeadMutation,
  useConvertLeadMutation,
  useCrmMembersQuery,
  useDeleteLeadMutation,
  useLeadsQuery,
} from '@/features/crm/leads/api/leads.queries'
import {
  dueLabel,
  dueToneClass,
  presetRange,
  toIsoDate,
} from '@/features/crm/leads/utils/lead-dashboard'
import { stepLabel } from '@/features/crm/leads/utils/lead-playbook'
import {
  leadScoreTone,
  leadStatusLabels,
  leadStatusOrder,
  leadStatusTone,
} from '@/features/crm/leads/utils/lead-status'
import { formatDate } from '@/lib/utils'

const emit = defineEmits<{
  edit: [lead: Lead]
  open: [lead: Lead]
}>()

const route = useRoute()
const router = useRouter()
const toast = useToast()

// --- Filter state, mirrored in the URL query so reload/back keeps it ---
type CreatedPreset = '' | '7d' | '30d' | '90d'
const perPageOptions = [10, 20, 50, 100]
const sortKeys: LeadSortKey[] = ['created_at', 'updated_at', 'contact_name', 'score', 'status']

function queryString(key: string) {
  const value = route.query[key]
  return typeof value === 'string' ? value : ''
}

function readSort(): LeadSort {
  const raw = queryString('sort')
  return sortKeys.includes(raw.replace(/^-/, '') as LeadSortKey) ? (raw as LeadSort) : '-created_at'
}

const search = ref(queryString('q'))
const debouncedSearch = ref(search.value)
const status = ref<LeadStatus | ''>(
  leadStatusOrder.includes(queryString('status') as LeadStatus)
    ? (queryString('status') as LeadStatus)
    : '',
)
const source = ref(queryString('source'))
const owner = ref(queryString('owner'))
const created = ref<CreatedPreset>(
  (['7d', '30d', '90d'] as const).includes(queryString('created') as '7d')
    ? (queryString('created') as CreatedPreset)
    : '',
)
const sort = ref<LeadSort>(readSort())
const page = ref(Math.max(1, Number(queryString('page')) || 1))
const perPage = ref(
  perPageOptions.includes(Number(queryString('per_page'))) ? Number(queryString('per_page')) : 20,
)

// The overview's status cards navigate here with ?status=…; follow it.
watch(
  () => route.query.status,
  (value) => {
    const next =
      typeof value === 'string' && leadStatusOrder.includes(value as LeadStatus)
        ? (value as LeadStatus)
        : ''
    if (next !== status.value) status.value = next
  },
)

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    debouncedSearch.value = value.trim()
  }, 300)
})

watch([debouncedSearch, status, source, owner, created, sort, perPage], () => {
  page.value = 1
})

watch([debouncedSearch, status, source, owner, created, sort, page, perPage], () => {
  const query: LocationQueryRaw = { ...route.query }
  const set = (key: string, value: string | number, fallback: string | number = '') => {
    if (value === fallback || value === '') delete query[key]
    else query[key] = String(value)
  }
  set('q', debouncedSearch.value)
  set('status', status.value)
  set('source', source.value)
  set('owner', owner.value)
  set('created', created.value)
  set('sort', sort.value, '-created_at')
  set('page', page.value, 1)
  set('per_page', perPage.value, 20)
  void router.replace({ query })
})

const params = computed<LeadListParams>(() => {
  const createdRange = created.value ? presetRange(created.value) : null
  return {
    page: page.value,
    per_page: perPage.value,
    search: debouncedSearch.value || undefined,
    status: status.value || undefined,
    source: source.value.trim() || undefined,
    owner_user_id: owner.value || undefined,
    created_from: createdRange?.from,
    created_to: createdRange ? toIsoDate(new Date()) : undefined,
    sort: sort.value,
  }
})

const leadsQuery = useLeadsQuery(params)
const leads = computed(() => leadsQuery.data.value?.data ?? [])
const total = computed(() => leadsQuery.data.value?.meta.total ?? 0)

const hasFilters = computed(() =>
  Boolean(debouncedSearch.value || status.value || source.value || owner.value || created.value),
)

function resetFilters() {
  search.value = ''
  debouncedSearch.value = ''
  status.value = ''
  source.value = ''
  owner.value = ''
  created.value = ''
}

const membersQuery = useCrmMembersQuery()
const members = computed(() => membersQuery.data.value ?? [])

// --- Sorting ---
function sortState(key: LeadSortKey): 'asc' | 'desc' | null {
  if (sort.value === key) return 'asc'
  if (sort.value === `-${key}`) return 'desc'
  return null
}

function toggleSort(key: LeadSortKey) {
  const current = sortState(key)
  // Names read naturally A→Z first; numbers and dates newest/highest first.
  const firstDirection = key === 'contact_name' || key === 'status' ? 'asc' : 'desc'
  const next = current === null ? firstDirection : current === 'asc' ? 'desc' : 'asc'
  sort.value = (next === 'asc' ? key : `-${key}`) as LeadSort
}

function ariaSort(key: LeadSortKey) {
  const state = sortState(key)
  return state === 'asc' ? 'ascending' : state === 'desc' ? 'descending' : 'none'
}

// --- Selection & bulk actions ---
const selectedIds = ref<Set<string>>(new Set())
// Keep lead objects for selected rows across pages, for CSV/bulk actions.
const selectedLeads = ref<Map<string, Lead>>(new Map())

const allVisibleSelected = computed(
  () => leads.value.length > 0 && leads.value.every((lead) => selectedIds.value.has(lead.id)),
)

function toggleSelectAll() {
  const ids = new Set(selectedIds.value)
  const map = new Map(selectedLeads.value)
  if (allVisibleSelected.value) {
    leads.value.forEach((lead) => {
      ids.delete(lead.id)
      map.delete(lead.id)
    })
  } else {
    leads.value.forEach((lead) => {
      ids.add(lead.id)
      map.set(lead.id, lead)
    })
  }
  selectedIds.value = ids
  selectedLeads.value = map
}

function toggleSelectRow(lead: Lead) {
  const ids = new Set(selectedIds.value)
  const map = new Map(selectedLeads.value)
  if (ids.has(lead.id)) {
    ids.delete(lead.id)
    map.delete(lead.id)
  } else {
    ids.add(lead.id)
    map.set(lead.id, lead)
  }
  selectedIds.value = ids
  selectedLeads.value = map
}

function clearSelection() {
  selectedIds.value = new Set()
  selectedLeads.value = new Map()
}

// Filters change the result set; the selection survives paging only.
watch([debouncedSearch, status, source, owner, created], clearSelection)

const deleteMutation = useDeleteLeadMutation()
const convertMutation = useConvertLeadMutation()
const assignMutation = useAssignLeadMutation()
const isBulkActing = ref(false)

function extractError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    if (response?.data?.message) return response.data.message
  }
  return 'Terjadi kesalahan, silakan coba lagi.'
}

/** Runs an action per lead sequentially and reports how many failed. */
async function runBulk(items: Lead[], action: (lead: Lead) => Promise<unknown>, done: string) {
  isBulkActing.value = true
  let failed = 0
  let lastError = ''
  try {
    for (const lead of items) {
      try {
        await action(lead)
      } catch (error) {
        failed++
        lastError = extractError(error)
      }
    }
  } finally {
    isBulkActing.value = false
  }
  clearSelection()
  if (failed === 0) toast.success(done)
  else toast.error(`${failed} dari ${items.length} lead gagal diproses. ${lastError}`)
}

async function bulkDelete() {
  const items = [...selectedLeads.value.values()]
  if (items.length === 0 || !confirm(`Hapus ${items.length} lead terpilih?`)) return
  await runBulk(
    items,
    (lead) => deleteMutation.mutateAsync(lead.id),
    `${items.length} lead dihapus.`,
  )
}

async function bulkConvert() {
  const items = [...selectedLeads.value.values()].filter((lead) => lead.status !== 'converted')
  if (items.length === 0) {
    toast.error('Semua lead terpilih sudah converted.')
    return
  }
  if (!confirm(`Convert ${items.length} lead terpilih menjadi contact/company?`)) return
  await runBulk(
    items,
    (lead) =>
      convertMutation.mutateAsync({ id: lead.id, createCompany: Boolean(lead.company_name) }),
    `${items.length} lead dikonversi.`,
  )
}

const isAssignOpen = ref(false)
const assignOwnerId = ref('')

function openAssign() {
  assignOwnerId.value = ''
  isAssignOpen.value = true
}

async function submitAssign() {
  if (!assignOwnerId.value) return
  const member = members.value.find((item) => item.user_id === assignOwnerId.value)
  const items = [...selectedLeads.value.values()]
  isAssignOpen.value = false
  await runBulk(
    items,
    (lead) => assignMutation.mutateAsync({ id: lead.id, ownerUserId: assignOwnerId.value }),
    `${items.length} lead di-assign ke ${member?.name ?? 'owner baru'}.`,
  )
}

function exportSelectedCsv() {
  const items = [...selectedLeads.value.values()]
  if (items.length === 0) return
  const header = [
    'Nama',
    'Company',
    'Email',
    'Telepon',
    'Sumber',
    'Status',
    'Score',
    'Owner',
    'Dibuat',
  ]
  const rows = items.map((lead) => [
    lead.contact_name,
    lead.company_name ?? '',
    lead.email ?? '',
    lead.phone ?? '',
    lead.source ?? '',
    leadStatusLabels[lead.status],
    String(lead.score),
    lead.owner_name ?? '',
    formatDate(lead.created_at),
  ])
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `leads-${toIsoDate(new Date())}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// --- Row actions ---
async function handleDelete(lead: Lead) {
  if (!confirm(`Hapus lead "${lead.contact_name}"?`)) return
  try {
    await deleteMutation.mutateAsync(lead.id)
    toast.success('Lead dihapus.')
  } catch (error) {
    toast.error(extractError(error))
  }
}

async function handleConvert(lead: Lead) {
  if (
    !confirm(
      `Convert lead "${lead.contact_name}" menjadi contact${lead.company_name ? ' + company' : ''}?`,
    )
  ) {
    return
  }
  try {
    await convertMutation.mutateAsync({ id: lead.id, createCompany: Boolean(lead.company_name) })
    toast.success('Lead dikonversi.')
  } catch (error) {
    toast.error(extractError(error))
  }
}

function initials(name?: string) {
  return (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

const createdOptions: { value: CreatedPreset; label: string }[] = [
  { value: '', label: 'Kapan saja' },
  { value: '7d', label: '7 hari terakhir' },
  { value: '30d', label: '30 hari terakhir' },
  { value: '90d', label: '90 hari terakhir' },
]
// Table shows the day only; the full timestamp is in the cell title.
const shortDate = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const sourceSuggestions = ['website', 'whatsapp', 'referral', 'instagram', 'event']
</script>

<template>
  <BaseCard class="!p-0">
    <!-- Filters -->
    <div class="space-y-3 border-b p-5">
      <div class="flex flex-wrap items-center gap-3">
        <label class="relative w-full max-w-sm flex-1 basis-64">
          <Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="search"
            type="search"
            placeholder="Cari nama, company, email..."
            aria-label="Cari lead"
            class="w-full rounded-lg border bg-white py-2 pr-3 pl-9 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
        <input
          v-model.lazy="source"
          list="lead-source-suggestions"
          placeholder="Semua sumber"
          aria-label="Filter sumber"
          class="w-40 rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        />
        <datalist id="lead-source-suggestions">
          <option v-for="item in sourceSuggestions" :key="item" :value="item" />
        </datalist>
        <select
          v-model="owner"
          aria-label="Filter owner"
          class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        >
          <option value="">Semua owner</option>
          <option v-for="member in members" :key="member.user_id" :value="member.user_id">
            {{ member.name }}
          </option>
        </select>
        <select
          v-model="created"
          aria-label="Filter tanggal dibuat"
          class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        >
          <option v-for="option in createdOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex flex-wrap gap-1.5" role="group" aria-label="Filter status">
          <button
            v-for="option in [
              { value: '', label: 'Semua' },
              ...leadStatusOrder.map((value) => ({ value, label: leadStatusLabels[value] })),
            ]"
            :key="option.value"
            type="button"
            class="rounded-full border px-3 py-1 text-xs font-medium"
            :class="
              status === option.value
                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-sky-950/40 dark:text-sky-300'
                : 'text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
            "
            :aria-pressed="status === option.value"
            @click="status = option.value as LeadStatus | ''"
          >
            {{ option.label }}
          </button>
        </div>
        <button
          v-if="hasFilters"
          type="button"
          class="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400"
          @click="resetFilters"
        >
          <X class="size-3.5" /> Reset filter
        </button>
        <span class="ml-auto text-sm text-gray-500 tabular-nums dark:text-gray-400"
          >{{ total }} hasil</span
        >
      </div>
    </div>

    <div v-if="leadsQuery.isPending.value" class="p-12 text-center text-sm text-gray-500">
      Memuat data...
    </div>
    <div v-else-if="leadsQuery.isError.value" class="p-12 text-center">
      <p class="font-semibold text-red-700">Data lead tidak dapat dimuat.</p>
      <button class="mt-2 text-sm font-medium text-brand-600" @click="leadsQuery.refetch()">
        Coba lagi
      </button>
    </div>
    <div v-else-if="leads.length === 0" class="p-12 text-center text-sm text-gray-500">
      <Magnet class="mx-auto mb-3 size-8 text-gray-300" />
      <template v-if="hasFilters">
        Tidak ada lead yang cocok dengan filter ini.
        <button class="font-medium text-brand-600 hover:underline" @click="resetFilters">
          Reset filter
        </button>
      </template>
      <template v-else>Belum ada lead.</template>
    </div>
    <div v-else class="max-h-[640px] overflow-auto">
      <table class="w-full text-left text-sm">
        <thead
          class="sticky top-0 z-10 bg-gray-50 text-xs text-gray-500 uppercase dark:bg-gray-900"
        >
          <tr>
            <th class="w-10 px-5 py-3">
              <input
                type="checkbox"
                class="size-4 rounded border-gray-300 accent-brand-500"
                :checked="allVisibleSelected"
                aria-label="Pilih semua lead di halaman ini"
                @change="toggleSelectAll"
              />
            </th>
            <th class="px-4 py-3" :aria-sort="ariaSort('contact_name')">
              <button
                type="button"
                class="inline-flex items-center gap-1 uppercase hover:text-gray-800 dark:hover:text-gray-200"
                @click="toggleSort('contact_name')"
              >
                Lead
                <ArrowUp
                  v-if="sortState('contact_name') === 'asc'"
                  class="size-3.5 text-brand-600"
                />
                <ArrowDown
                  v-else-if="sortState('contact_name') === 'desc'"
                  class="size-3.5 text-brand-600"
                />
                <ArrowUpDown v-else class="size-3.5 opacity-40" />
              </button>
            </th>
            <th class="px-4 py-3">Sumber</th>
            <th class="px-4 py-3" :aria-sort="ariaSort('status')">
              <button
                type="button"
                class="inline-flex items-center gap-1 uppercase hover:text-gray-800 dark:hover:text-gray-200"
                @click="toggleSort('status')"
              >
                Status
                <ArrowUp v-if="sortState('status') === 'asc'" class="size-3.5 text-brand-600" />
                <ArrowDown
                  v-else-if="sortState('status') === 'desc'"
                  class="size-3.5 text-brand-600"
                />
                <ArrowUpDown v-else class="size-3.5 opacity-40" />
              </button>
            </th>
            <th class="px-4 py-3">Langkah berikutnya</th>
            <th class="px-4 py-3" :aria-sort="ariaSort('score')">
              <button
                type="button"
                class="inline-flex items-center gap-1 uppercase hover:text-gray-800 dark:hover:text-gray-200"
                @click="toggleSort('score')"
              >
                Score
                <ArrowUp v-if="sortState('score') === 'asc'" class="size-3.5 text-brand-600" />
                <ArrowDown
                  v-else-if="sortState('score') === 'desc'"
                  class="size-3.5 text-brand-600"
                />
                <ArrowUpDown v-else class="size-3.5 opacity-40" />
              </button>
            </th>
            <th class="px-4 py-3">Owner</th>
            <th class="px-4 py-3" :aria-sort="ariaSort('created_at')">
              <button
                type="button"
                class="inline-flex items-center gap-1 uppercase hover:text-gray-800 dark:hover:text-gray-200"
                @click="toggleSort('created_at')"
              >
                Dibuat
                <ArrowUp v-if="sortState('created_at') === 'asc'" class="size-3.5 text-brand-600" />
                <ArrowDown
                  v-else-if="sortState('created_at') === 'desc'"
                  class="size-3.5 text-brand-600"
                />
                <ArrowUpDown v-else class="size-3.5 opacity-40" />
              </button>
            </th>
            <th class="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="lead in leads"
            :key="lead.id"
            class="border-b last:border-0 hover:bg-gray-50/60 dark:hover:bg-gray-800/40"
            :class="selectedIds.has(lead.id) ? 'bg-brand-50/40 dark:bg-brand-950/20' : ''"
          >
            <td class="px-4 py-3">
              <input
                type="checkbox"
                class="size-4 rounded border-gray-300 accent-brand-500"
                :checked="selectedIds.has(lead.id)"
                :aria-label="`Pilih ${lead.contact_name}`"
                @change="toggleSelectRow(lead)"
              />
            </td>
            <td class="px-4 py-3">
              <button
                class="text-left font-medium hover:text-brand-600 hover:underline"
                @click="emit('open', lead)"
              >
                {{ lead.contact_name }}
              </button>
              <p
                v-if="lead.company_name || lead.email"
                class="max-w-64 truncate text-xs text-gray-500"
                :title="[lead.company_name, lead.email].filter(Boolean).join(' · ')"
              >
                {{ [lead.company_name, lead.email].filter(Boolean).join(' · ') }}
              </p>
            </td>
            <td class="px-4 py-3">
              <span
                v-if="lead.source"
                class="rounded bg-gray-100 px-2 py-1 text-xs font-semibold tracking-wide text-gray-600 uppercase dark:bg-gray-800 dark:text-gray-300"
              >
                {{ lead.source }}
              </span>
              <span v-else class="text-gray-400">–</span>
            </td>
            <td class="px-4 py-3">
              <span
                class="rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
                :class="leadStatusTone[lead.status]"
              >
                {{ leadStatusLabels[lead.status] }}
              </span>
            </td>
            <td class="px-4 py-3">
              <template v-if="lead.playbook_run?.status === 'active'">
                <p class="whitespace-nowrap font-medium">{{ stepLabel(lead.playbook_run) }}</p>
                <p
                  class="text-xs whitespace-nowrap"
                  :class="dueToneClass[dueLabel(lead.playbook_run.due_at).tone]"
                >
                  {{ dueLabel(lead.playbook_run.due_at).text }}
                </p>
              </template>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td class="px-4 py-3">
              <span
                class="inline-flex items-center gap-2 whitespace-nowrap"
                :title="leadScoreTone(lead.score).label"
              >
                <span class="h-1.5 w-11 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <span
                    class="block h-full rounded-full"
                    :class="leadScoreTone(lead.score).bar"
                    :style="{ width: `${lead.score}%` }"
                  />
                </span>
                <span class="font-semibold tabular-nums">{{ lead.score }}</span>
              </span>
            </td>
            <td class="px-4 py-3">
              <span v-if="lead.owner_name" class="inline-flex items-center gap-2 whitespace-nowrap">
                <span
                  class="grid size-6 place-items-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-700 dark:bg-sky-950/50 dark:text-sky-300"
                >
                  {{ initials(lead.owner_name) }}
                </span>
                {{ lead.owner_name }}
              </span>
              <span v-else class="text-xs whitespace-nowrap text-gray-400">Belum di-assign</span>
            </td>
            <td
              class="px-4 py-3 whitespace-nowrap text-gray-500 tabular-nums"
              :title="formatDate(lead.created_at)"
            >
              {{ shortDate.format(new Date(lead.created_at)) }}
            </td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-1.5">
                <button
                  v-if="lead.status !== 'converted'"
                  type="button"
                  class="grid size-8 place-items-center rounded-lg border text-gray-500 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-gray-700 dark:hover:bg-emerald-950/40"
                  :aria-label="`Convert ${lead.contact_name}`"
                  :title="`Convert menjadi contact${lead.company_name ? ' + company' : ''}`"
                  @click="handleConvert(lead)"
                >
                  <UserCheck class="size-4" />
                </button>
                <button
                  type="button"
                  class="grid size-8 place-items-center rounded-lg border text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:hover:bg-gray-800"
                  :aria-label="`Edit ${lead.contact_name}`"
                  @click="emit('edit', lead)"
                >
                  <Pencil class="size-4" />
                </button>
                <button
                  type="button"
                  class="grid size-8 place-items-center rounded-lg border text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-gray-700 dark:hover:bg-red-950/40"
                  :aria-label="`Hapus ${lead.contact_name}`"
                  @click="handleDelete(lead)"
                >
                  <Trash2 class="size-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <DataPagination
      v-if="total > 0"
      v-model:page="page"
      v-model:per-page="perPage"
      :total="total"
      :per-page-options="perPageOptions"
      item-label="lead"
    />
  </BaseCard>

  <!-- Bulk action dock -->
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="translate-y-4 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-100 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-4 opacity-0"
  >
    <div
      v-if="selectedIds.size > 0"
      class="fixed inset-x-0 bottom-6 z-40 mx-auto flex w-fit lg:left-72 max-w-[95vw] flex-wrap items-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm text-white shadow-xl dark:bg-black"
    >
      <span class="pr-2 font-medium">{{ selectedIds.size }} lead dipilih</span>
      <BaseButton variant="secondary" :disabled="isBulkActing" @click="bulkConvert">
        <UserCheck class="size-4" /> Convert
      </BaseButton>
      <BaseButton variant="secondary" :disabled="isBulkActing" @click="openAssign">
        <UserPlus class="size-4" /> Assign owner
      </BaseButton>
      <BaseButton variant="secondary" :disabled="isBulkActing" @click="exportSelectedCsv">
        <Download class="size-4" /> Download .csv
      </BaseButton>
      <BaseButton variant="danger" :disabled="isBulkActing" @click="bulkDelete">
        <Trash2 class="size-4" /> Hapus
      </BaseButton>
      <button
        type="button"
        class="ml-1 grid size-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white"
        aria-label="Batalkan pilihan"
        @click="clearSelection"
      >
        <X class="size-4" />
      </button>
    </div>
  </Transition>

  <BaseModal :open="isAssignOpen" title="Assign owner" @close="isAssignOpen = false">
    <form class="space-y-4" @submit.prevent="submitAssign">
      <p class="text-sm text-gray-600 dark:text-gray-300">
        Owner baru untuk <strong class="tabular-nums">{{ selectedIds.size }}</strong> lead terpilih.
      </p>
      <label class="block text-sm">
        <span class="mb-1.5 block font-medium">Owner</span>
        <select
          v-model="assignOwnerId"
          required
          class="w-full rounded-lg border bg-white px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        >
          <option value="" disabled>Pilih anggota tim</option>
          <option v-for="member in members" :key="member.user_id" :value="member.user_id">
            {{ member.name }} · {{ member.email }}
          </option>
        </select>
      </label>
      <p v-if="membersQuery.isError.value" class="text-sm text-red-600">
        Daftar anggota tidak dapat dimuat.
      </p>
      <div class="flex justify-end gap-3 pt-2">
        <BaseButton type="button" variant="secondary" @click="isAssignOpen = false"
          >Batal</BaseButton
        >
        <BaseButton type="submit" :disabled="!assignOwnerId || isBulkActing">Assign</BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
