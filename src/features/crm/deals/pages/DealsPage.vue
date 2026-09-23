<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  CircleDollarSign,
  Plus,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Waypoints,
} from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import TextField from '@/components/form/TextField.vue'

import { usePipelinesQuery } from '@/features/crm/pipelines/api/pipelines.queries'
import type { Deal, DealPayload } from '@/features/crm/deals/api/deals.api'
import {
  useCloseDealLostMutation,
  useCloseDealWonMutation,
  useCreateDealMutation,
  useDealsQuery,
  useDeleteDealMutation,
  useMoveDealStageMutation,
} from '@/features/crm/deals/api/deals.queries'

const pipelinesParams = computed(() => ({ page: 1, per_page: 50 }))
const pipelinesQuery = usePipelinesQuery(pipelinesParams)
const pipelines = computed(() => pipelinesQuery.data.value?.data ?? [])

const selectedPipelineId = ref('')

watch(
  pipelines,
  (list) => {
    if (!selectedPipelineId.value && list.length > 0) {
      selectedPipelineId.value = list.find((p) => p.is_default)?.id ?? list[0]?.id ?? ''
    }
  },
  { immediate: true },
)

const selectedPipeline = computed(() =>
  pipelines.value.find((p) => p.id === selectedPipelineId.value),
)
const stages = computed(() => selectedPipeline.value?.stages ?? [])

const search = ref('')

const dealsParams = computed(() => ({
  page: 1,
  per_page: 100,
  pipeline_id: selectedPipelineId.value || undefined,
  search: search.value || undefined,
  status: 'open' as const,
}))

const dealsQuery = useDealsQuery(dealsParams)
const deals = computed(() => dealsQuery.data.value?.data ?? [])

function dealsForStage(stageId: string) {
  return deals.value.filter((deal) => deal.stage_id === stageId)
}

// Stat cards: Open dipakai dari query board di atas (sudah ke-fetch). Won/Lost
// pakai query terpisah supaya hitungannya (meta.total) akurat dari backend.
const wonStatsQuery = useDealsQuery(
  computed(() => ({
    page: 1,
    per_page: 100,
    pipeline_id: selectedPipelineId.value || undefined,
    status: 'won' as const,
  })),
)
const lostStatsQuery = useDealsQuery(
  computed(() => ({
    page: 1,
    per_page: 100,
    pipeline_id: selectedPipelineId.value || undefined,
    status: 'lost' as const,
  })),
)

function sumValue(list: Deal[]) {
  return list.reduce((total, deal) => total + (Number(deal.value) || 0), 0)
}

function formatAmount(amount: number, currency = 'IDR') {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency }).format(amount)
}

// per_page di-cap 100 — kalau total lebih dari itu, sum di bawah cuma dari data
// yang ke-fetch (bukan sum global), jadi ditandai "+" biar tidak menyesatkan.
const wonValueLabel = computed(() => {
  const data = wonStatsQuery.data.value
  if (!data) return '-'
  const sum = formatAmount(sumValue(data.data))
  return data.meta.total > data.data.length ? `${sum}+` : sum
})

const moveStageMutation = useMoveDealStageMutation()
const closeWonMutation = useCloseDealWonMutation()
const closeLostMutation = useCloseDealLostMutation()
const deleteMutation = useDeleteDealMutation()
const createMutation = useCreateDealMutation()

async function handleMoveStage(deal: Deal, stageId: string) {
  if (stageId === deal.stage_id) return
  await moveStageMutation.mutateAsync({ id: deal.id, stageId })
}

async function handleCloseWon(deal: Deal) {
  if (!confirm(`Tandai deal "${deal.title}" sebagai Won?`)) return
  await closeWonMutation.mutateAsync(deal.id)
}

async function handleCloseLost(deal: Deal) {
  const reason = prompt(`Alasan deal "${deal.title}" lost (opsional):`) ?? undefined
  await closeLostMutation.mutateAsync({ id: deal.id, lostReason: reason })
}

async function handleDelete(deal: Deal) {
  if (!confirm(`Hapus deal "${deal.title}"?`)) return
  await deleteMutation.mutateAsync(deal.id)
}

// --- Seleksi kartu & bulk actions ---
const selectedIds = ref<Set<string>>(new Set())

watch(deals, () => {
  selectedIds.value = new Set()
})

function toggleSelectDeal(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedIds.value = next
}

const selectedDeals = computed(() => deals.value.filter((deal) => selectedIds.value.has(deal.id)))
const isBulkActing = ref(false)

async function bulkCloseWon() {
  if (selectedDeals.value.length === 0) return
  if (!confirm(`Tandai ${selectedDeals.value.length} deal terpilih sebagai Won?`)) return
  isBulkActing.value = true
  try {
    for (const deal of selectedDeals.value) {
      await closeWonMutation.mutateAsync(deal.id)
    }
    selectedIds.value = new Set()
  } finally {
    isBulkActing.value = false
  }
}

async function bulkCloseLost() {
  if (selectedDeals.value.length === 0) return
  const reason =
    prompt(`Alasan ${selectedDeals.value.length} deal terpilih lost (opsional):`) ?? undefined
  isBulkActing.value = true
  try {
    for (const deal of selectedDeals.value) {
      await closeLostMutation.mutateAsync({ id: deal.id, lostReason: reason })
    }
    selectedIds.value = new Set()
  } finally {
    isBulkActing.value = false
  }
}

async function bulkDelete() {
  if (selectedDeals.value.length === 0) return
  if (!confirm(`Hapus ${selectedDeals.value.length} deal terpilih?`)) return
  isBulkActing.value = true
  try {
    for (const deal of selectedDeals.value) {
      await deleteMutation.mutateAsync(deal.id)
    }
    selectedIds.value = new Set()
  } finally {
    isBulkActing.value = false
  }
}

function formatValue(deal: Deal) {
  const amount = Number(deal.value)
  if (Number.isNaN(amount)) return `${deal.currency} ${deal.value}`
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: deal.currency || 'IDR',
  }).format(amount)
}

// --- Create deal modal ---
const isModalOpen = ref(false)
const errorMessage = ref('')
const form = reactive<DealPayload>({
  pipeline_id: '',
  stage_id: '',
  title: '',
  value: '',
})

function openCreateModal() {
  form.pipeline_id = selectedPipelineId.value
  form.stage_id = stages.value[0]?.id ?? ''
  form.title = ''
  form.value = ''
  errorMessage.value = ''
  isModalOpen.value = true
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
    await createMutation.mutateAsync({ ...form })
    isModalOpen.value = false
  } catch (error) {
    errorMessage.value = extractError(error)
  }
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Deals" description="Kanban board deal berdasarkan tahapan pipeline.">
      <BaseButton :disabled="!selectedPipelineId" @click="openCreateModal">
        <Plus class="size-4" />
        Deal Baru
      </BaseButton>
    </PageHeader>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <BaseCard class="!p-4">
        <div class="flex items-center gap-3">
          <span
            class="grid size-11 place-items-center rounded-2xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            <Waypoints class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">Open</p>
            <p class="text-2xl font-bold">{{ dealsQuery.data.value?.meta.total ?? 0 }}</p>
          </div>
        </div>
      </BaseCard>
      <BaseCard class="!p-4">
        <div class="flex items-center gap-3">
          <span
            class="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <TrendingUp class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">Won</p>
            <p class="text-2xl font-bold">{{ wonStatsQuery.data.value?.meta.total ?? 0 }}</p>
          </div>
        </div>
      </BaseCard>
      <BaseCard class="!p-4">
        <div class="flex items-center gap-3">
          <span
            class="grid size-11 place-items-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"
          >
            <TrendingDown class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">Lost</p>
            <p class="text-2xl font-bold">{{ lostStatsQuery.data.value?.meta.total ?? 0 }}</p>
          </div>
        </div>
      </BaseCard>
      <BaseCard class="!p-4">
        <div class="flex items-center gap-3">
          <span
            class="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950"
          >
            <CircleDollarSign class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">Total Won</p>
            <p class="text-2xl font-bold">{{ wonValueLabel }}</p>
          </div>
        </div>
      </BaseCard>
    </div>

    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <label class="relative w-full max-w-sm">
        <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="search"
          type="search"
          placeholder="Cari judul deal..."
          class="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
        />
      </label>
      <div v-if="pipelines.length > 1" class="flex items-center gap-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Pipeline:</label>
        <select
          v-model="selectedPipelineId"
          class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
        >
          <option v-for="pipeline in pipelines" :key="pipeline.id" :value="pipeline.id">
            {{ pipeline.name }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="!selectedPipelineId" class="p-12 text-center text-sm text-gray-500">
      <Waypoints class="mx-auto mb-3 size-8 text-gray-300" />
      Belum ada pipeline. Buat pipeline terlebih dahulu di menu Pipelines.
    </div>
    <div v-else-if="dealsQuery.isPending.value" class="p-12 text-center text-sm text-gray-500">
      Memuat data...
    </div>
    <div v-else class="flex gap-4 overflow-x-auto pb-4">
      <div v-for="stage in stages" :key="stage.id" class="w-72 flex-shrink-0">
        <BaseCard class="!p-0">
          <div class="flex items-center justify-between border-b p-3">
            <span class="text-sm font-semibold">{{ stage.name }}</span>
            <span class="text-xs text-gray-500">{{ dealsForStage(stage.id).length }}</span>
          </div>
          <div class="min-h-[200px] space-y-2 p-3">
            <div
              v-for="deal in dealsForStage(stage.id)"
              :key="deal.id"
              class="rounded-lg border p-3 text-sm shadow-sm dark:border-gray-800"
              :class="
                selectedIds.has(deal.id)
                  ? 'border-brand-300 bg-brand-50/30 dark:border-brand-800'
                  : ''
              "
            >
              <div class="flex items-start gap-2">
                <input
                  type="checkbox"
                  class="mt-0.5 size-4 shrink-0 rounded border-gray-300 accent-brand-500"
                  :checked="selectedIds.has(deal.id)"
                  @change="toggleSelectDeal(deal.id)"
                />
                <div class="min-w-0 flex-1">
                  <p class="font-medium">{{ deal.title }}</p>
                  <p class="text-xs text-gray-500">{{ formatValue(deal) }}</p>
                </div>
              </div>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <select
                  class="rounded border bg-white px-2 py-1 text-xs outline-none dark:bg-gray-950"
                  :value="deal.stage_id"
                  @change="handleMoveStage(deal, ($event.target as HTMLSelectElement).value)"
                >
                  <option v-for="s in stages" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
                <button class="text-xs font-medium text-emerald-600" @click="handleCloseWon(deal)">
                  Won
                </button>
                <button class="text-xs font-medium text-red-600" @click="handleCloseLost(deal)">
                  Lost
                </button>
                <button
                  class="ml-auto text-gray-400 hover:text-red-600"
                  title="Hapus deal"
                  @click="handleDelete(deal)"
                >
                  <Trash2 class="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>

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
        <span class="pr-2 font-medium">{{ selectedIds.size }} deal dipilih</span>
        <BaseButton variant="secondary" :disabled="isBulkActing" @click="bulkCloseWon">
          Tandai Won
        </BaseButton>
        <BaseButton variant="secondary" :disabled="isBulkActing" @click="bulkCloseLost">
          Tandai Lost
        </BaseButton>
        <BaseButton variant="danger" :disabled="isBulkActing" @click="bulkDelete">
          <Trash2 class="size-4" />
          Hapus
        </BaseButton>
      </div>
    </Transition>

    <BaseModal :open="isModalOpen" title="Deal Baru" @close="isModalOpen = false">
      <form class="space-y-4" @submit.prevent="submitForm">
        <TextField v-model="form.title" name="title" label="Judul Deal" />
        <div class="grid grid-cols-2 gap-4">
          <TextField
            v-model="form.value"
            name="value"
            label="Nilai (angka)"
            placeholder="1000000"
          />
          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Stage</span
            >
            <select
              v-model="form.stage_id"
              class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
            >
              <option v-for="s in stages" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </label>
        </div>

        <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

        <div class="flex justify-end gap-3 pt-2">
          <BaseButton type="button" variant="secondary" @click="isModalOpen = false"
            >Batal</BaseButton
          >
          <BaseButton type="submit" :disabled="createMutation.isPending.value">
            {{ createMutation.isPending.value ? 'Menyimpan...' : 'Simpan' }}
          </BaseButton>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
