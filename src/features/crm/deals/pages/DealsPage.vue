<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Plus, Waypoints } from 'lucide-vue-next'

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

const dealsParams = computed(() => ({
  page: 1,
  per_page: 100,
  pipeline_id: selectedPipelineId.value || undefined,
  status: 'open' as const,
}))

const dealsQuery = useDealsQuery(dealsParams)
const deals = computed(() => dealsQuery.data.value?.data ?? [])

function dealsForStage(stageId: string) {
  return deals.value.filter((deal) => deal.stage_id === stageId)
}

const moveStageMutation = useMoveDealStageMutation()
const closeWonMutation = useCloseDealWonMutation()
const closeLostMutation = useCloseDealLostMutation()
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
            >
              <p class="font-medium">{{ deal.title }}</p>
              <p class="text-xs text-gray-500">{{ formatValue(deal) }}</p>
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
              </div>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>

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
