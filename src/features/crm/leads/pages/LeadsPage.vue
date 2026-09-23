<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  Download,
  Magnet,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import TextField from '@/components/form/TextField.vue'

import type { Lead, LeadPayload, LeadStatus } from '@/features/crm/leads/api/leads.api'
import {
  useConvertLeadMutation,
  useCreateLeadMutation,
  useDeleteLeadMutation,
  useLeadsQuery,
  useRestoreLeadMutation,
  useUpdateLeadMutation,
} from '@/features/crm/leads/api/leads.queries'
import { formatDate } from '@/lib/utils'

const statusLabels: Record<LeadStatus, string> = {
  new: 'Baru',
  contacted: 'Dihubungi',
  qualified: 'Qualified',
  unqualified: 'Unqualified',
  converted: 'Converted',
}

const statusTone: Record<LeadStatus, string> = {
  new: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  contacted: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  qualified: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  unqualified: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  converted: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
}

function scoreTone(score: number) {
  if (score >= 67) {
    return {
      label: 'HIGH',
      class: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    }
  }
  if (score >= 34) {
    return {
      label: 'MID',
      class: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    }
  }
  return { label: 'LOW', class: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' }
}

const search = ref('')
const page = ref(1)
const perPage = 20
const statusFilter = ref<LeadStatus | 'all'>('all')

const params = computed(() => ({
  page: page.value,
  per_page: perPage,
  search: search.value || undefined,
  status: statusFilter.value === 'all' ? undefined : statusFilter.value,
}))

const leadsQuery = useLeadsQuery(params)
const createMutation = useCreateLeadMutation()
const updateMutation = useUpdateLeadMutation()
const deleteMutation = useDeleteLeadMutation()
const restoreMutation = useRestoreLeadMutation()
const convertMutation = useConvertLeadMutation()

// Stat cards pakai query terpisah (per_page: 1) supaya total per status akurat
// dari backend (meta.total), bukan cuma dihitung dari halaman yang sedang tampil.
const newStatsQuery = useLeadsQuery(
  computed(() => ({ page: 1, per_page: 1, status: 'new' as const })),
)
const contactedStatsQuery = useLeadsQuery(
  computed(() => ({ page: 1, per_page: 1, status: 'contacted' as const })),
)
const qualifiedStatsQuery = useLeadsQuery(
  computed(() => ({ page: 1, per_page: 1, status: 'qualified' as const })),
)
const convertedStatsQuery = useLeadsQuery(
  computed(() => ({ page: 1, per_page: 1, status: 'converted' as const })),
)

const statCards = computed(() => [
  { label: 'New', value: newStatsQuery.data.value?.meta.total ?? 0, tone: statusTone.new },
  {
    label: 'Contacted',
    value: contactedStatsQuery.data.value?.meta.total ?? 0,
    tone: statusTone.contacted,
  },
  {
    label: 'Qualified',
    value: qualifiedStatsQuery.data.value?.meta.total ?? 0,
    tone: statusTone.qualified,
  },
  {
    label: 'Converted',
    value: convertedStatsQuery.data.value?.meta.total ?? 0,
    tone: statusTone.converted,
  },
])

const leads = computed(() => leadsQuery.data.value?.data ?? [])
const totalPages = computed(() => leadsQuery.data.value?.meta.total_pages ?? 1)
const totalLeads = computed(() => leadsQuery.data.value?.meta.total ?? 0)
const currentPage = computed(() => leadsQuery.data.value?.meta.page ?? page.value)

watch([search, statusFilter], () => {
  page.value = 1
})

function changePage(next: number) {
  if (next < 1 || next > totalPages.value) return
  page.value = next
}

// --- Seleksi baris & bulk actions ---
const selectedIds = ref<Set<string>>(new Set())

watch(leads, () => {
  selectedIds.value = new Set()
})

const allVisibleSelected = computed(
  () => leads.value.length > 0 && leads.value.every((lead) => selectedIds.value.has(lead.id)),
)

function toggleSelectAll() {
  selectedIds.value = allVisibleSelected.value
    ? new Set()
    : new Set(leads.value.map((lead) => lead.id))
}

function toggleSelectRow(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedIds.value = next
}

const selectedLeads = computed(() => leads.value.filter((lead) => selectedIds.value.has(lead.id)))
const isBulkActing = ref(false)

async function bulkDelete() {
  if (selectedLeads.value.length === 0) return
  if (!confirm(`Hapus ${selectedLeads.value.length} lead terpilih?`)) return
  isBulkActing.value = true
  try {
    for (const lead of selectedLeads.value) {
      await deleteMutation.mutateAsync(lead.id)
    }
    selectedIds.value = new Set()
  } finally {
    isBulkActing.value = false
  }
}

async function bulkConvert() {
  const eligible = selectedLeads.value.filter(
    (lead) => lead.status !== 'converted' && !lead.deleted_at,
  )
  if (eligible.length === 0) return
  if (!confirm(`Convert ${eligible.length} lead terpilih menjadi contact/company?`)) return
  isBulkActing.value = true
  try {
    for (const lead of eligible) {
      await convertMutation.mutateAsync({ id: lead.id, createCompany: Boolean(lead.company_name) })
    }
    selectedIds.value = new Set()
  } finally {
    isBulkActing.value = false
  }
}

function exportSelectedCsv() {
  if (selectedLeads.value.length === 0) return
  const header = ['Nama', 'Company', 'Email', 'Telepon', 'Sumber', 'Status', 'Score', 'Dibuat']
  const rows = selectedLeads.value.map((lead) => [
    lead.contact_name,
    lead.company_name ?? '',
    lead.email ?? '',
    lead.phone ?? '',
    lead.source ?? '',
    statusLabels[lead.status],
    String(lead.score),
    formatDate(lead.created_at),
  ])
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

const isModalOpen = ref(false)
const editingLead = ref<Lead | null>(null)
const errorMessage = ref('')
const form = reactive<LeadPayload>({
  contact_name: '',
  company_name: '',
  email: '',
  phone: '',
  source: '',
})

function openCreateModal() {
  editingLead.value = null
  Object.assign(form, { contact_name: '', company_name: '', email: '', phone: '', source: '' })
  errorMessage.value = ''
  isModalOpen.value = true
}

function openEditModal(lead: Lead) {
  editingLead.value = lead
  Object.assign(form, {
    contact_name: lead.contact_name,
    company_name: lead.company_name ?? '',
    email: lead.email ?? '',
    phone: lead.phone ?? '',
    source: lead.source ?? '',
  })
  errorMessage.value = ''
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
}

function extractError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    if (response?.data?.message) return response.data.message
  }
  return 'Terjadi kesalahan, silakan coba lagi.'
}

async function submitForm() {
  errorMessage.value = ''
  try {
    if (editingLead.value) {
      await updateMutation.mutateAsync({ id: editingLead.value.id, payload: { ...form } })
    } else {
      await createMutation.mutateAsync({ ...form })
    }
    isModalOpen.value = false
  } catch (error) {
    errorMessage.value = extractError(error)
  }
}

async function handleDelete(lead: Lead) {
  if (!confirm(`Hapus lead "${lead.contact_name}"?`)) return
  await deleteMutation.mutateAsync(lead.id)
}

async function handleRestore(lead: Lead) {
  await restoreMutation.mutateAsync(lead.id)
}

async function handleConvert(lead: Lead) {
  if (
    !confirm(
      `Convert lead "${lead.contact_name}" menjadi contact${lead.company_name ? ' + company' : ''}?`,
    )
  )
    return
  try {
    await convertMutation.mutateAsync({ id: lead.id, createCompany: Boolean(lead.company_name) })
  } catch (error) {
    alert(extractError(error))
  }
}

const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Leads"
      description="Kelola prospek sebelum dikonversi menjadi contact/company."
    >
      <BaseButton @click="openCreateModal">
        <Plus class="size-4" />
        Lead Baru
      </BaseButton>
    </PageHeader>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <BaseCard v-for="stat in statCards" :key="stat.label" class="!p-4">
        <div class="flex items-center gap-3">
          <span class="grid size-11 place-items-center rounded-2xl" :class="stat.tone">
            <Users class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">{{ stat.label }}</p>
            <p class="text-2xl font-bold">{{ stat.value }}</p>
          </div>
        </div>
      </BaseCard>
    </div>

    <div class="flex gap-2 overflow-x-auto border-b">
      <button
        v-for="tab in [
          { value: 'all', label: 'Semua' },
          ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
        ]"
        :key="tab.value"
        class="border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap"
        :class="
          statusFilter === tab.value
            ? 'border-brand-500 text-brand-600 font-semibold'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        "
        @click="statusFilter = tab.value as typeof statusFilter"
      >
        {{ tab.label }}
      </button>
    </div>

    <BaseCard class="!p-0">
      <div class="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
        <label class="relative w-full max-w-sm">
          <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="search"
            type="search"
            placeholder="Cari nama, company, email..."
            class="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          />
        </label>
        <div class="text-sm text-gray-500">{{ totalLeads }} lead</div>
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
        Belum ada lead.
      </div>
      <div v-else class="overflow-x-auto pb-16">
        <table class="w-full text-left text-sm">
          <thead class="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900">
            <tr>
              <th class="w-10 px-5 py-3">
                <input
                  type="checkbox"
                  class="size-4 rounded border-gray-300 accent-brand-500"
                  :checked="allVisibleSelected"
                  @change="toggleSelectAll"
                />
              </th>
              <th class="px-5 py-3">Lead</th>
              <th class="px-5 py-3">Company</th>
              <th class="px-5 py-3">Sumber</th>
              <th class="px-5 py-3">Status</th>
              <th class="px-5 py-3">Score</th>
              <th class="px-5 py-3">Update Terakhir</th>
              <th class="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="lead in leads"
              :key="lead.id"
              class="border-b last:border-0"
              :class="selectedIds.has(lead.id) ? 'bg-brand-50/40 dark:bg-brand-950/20' : ''"
            >
              <td class="px-5 py-3">
                <input
                  type="checkbox"
                  class="size-4 rounded border-gray-300 accent-brand-500"
                  :checked="selectedIds.has(lead.id)"
                  @change="toggleSelectRow(lead.id)"
                />
              </td>
              <td class="px-5 py-3">
                <p class="font-medium">{{ lead.contact_name }}</p>
                <p v-if="lead.email" class="text-xs text-gray-500">{{ lead.email }}</p>
              </td>
              <td class="px-5 py-3 text-gray-500">{{ lead.company_name || '-' }}</td>
              <td class="px-5 py-3">
                <span
                  v-if="lead.source"
                  class="rounded bg-gray-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                  {{ lead.source }}
                </span>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="px-5 py-3">
                <span
                  class="rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="statusTone[lead.status]"
                >
                  {{ statusLabels[lead.status] }}
                </span>
              </td>
              <td class="px-5 py-3">
                <span
                  class="rounded-full px-2.5 py-1 text-xs font-semibold"
                  :class="scoreTone(lead.score).class"
                >
                  {{ scoreTone(lead.score).label }} · {{ lead.score }}
                </span>
              </td>
              <td class="px-5 py-3 text-gray-500">{{ formatDate(lead.updated_at) }}</td>
              <td class="px-5 py-3">
                <div class="flex justify-end gap-2">
                  <template v-if="!lead.deleted_at">
                    <BaseButton
                      v-if="lead.status !== 'converted'"
                      variant="outline"
                      @click="handleConvert(lead)"
                    >
                      Convert
                    </BaseButton>
                    <BaseButton variant="outline" @click="openEditModal(lead)">Edit</BaseButton>
                    <BaseButton variant="danger" @click="handleDelete(lead)">
                      <Trash2 class="size-4" />
                    </BaseButton>
                  </template>
                  <BaseButton v-else variant="secondary" @click="handleRestore(lead)">
                    <RotateCcw class="size-4" />
                    Restore
                  </BaseButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex flex-col gap-3 border-t p-5 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-gray-500">Halaman {{ currentPage }} dari {{ totalPages }}.</p>
        <div class="flex items-center gap-2">
          <BaseButton
            variant="secondary"
            :disabled="currentPage <= 1"
            @click="changePage(currentPage - 1)"
          >
            Sebelumnya
          </BaseButton>
          <BaseButton
            variant="secondary"
            :disabled="currentPage >= totalPages"
            @click="changePage(currentPage + 1)"
          >
            Berikutnya
          </BaseButton>
        </div>
      </div>
    </BaseCard>

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
        class="fixed inset-x-0 bottom-6 z-40 mx-auto flex w-fit max-w-[95vw] flex-wrap items-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm text-white shadow-xl dark:bg-black"
      >
        <span class="pr-2 font-medium">{{ selectedIds.size }} lead dipilih</span>
        <BaseButton variant="secondary" :disabled="isBulkActing" @click="bulkConvert">
          <UserCheck class="size-4" />
          Convert
        </BaseButton>
        <BaseButton variant="secondary" :disabled="isBulkActing" @click="exportSelectedCsv">
          <Download class="size-4" />
          Download as .csv
        </BaseButton>
        <BaseButton variant="danger" :disabled="isBulkActing" @click="bulkDelete">
          <Trash2 class="size-4" />
          Hapus
        </BaseButton>
      </div>
    </Transition>

    <BaseModal
      :open="isModalOpen"
      :title="editingLead ? 'Edit Lead' : 'Lead Baru'"
      @close="closeModal"
    >
      <form class="space-y-4" @submit.prevent="submitForm">
        <TextField v-model="form.contact_name" name="contact_name" label="Nama Kontak" />
        <TextField v-model="form.company_name" name="company_name" label="Nama Company" />
        <div class="grid grid-cols-2 gap-4">
          <TextField v-model="form.email" name="email" label="Email" type="email" />
          <TextField v-model="form.phone" name="phone" label="Telepon" />
        </div>
        <TextField
          v-model="form.source"
          name="source"
          label="Sumber"
          placeholder="Website, referral, ..."
        />

        <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

        <div class="flex justify-end gap-3 pt-2">
          <BaseButton type="button" variant="secondary" @click="closeModal">Batal</BaseButton>
          <BaseButton type="submit" :disabled="isSaving">
            {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
          </BaseButton>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
