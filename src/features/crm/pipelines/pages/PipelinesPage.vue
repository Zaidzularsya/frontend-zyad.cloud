<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Archive, Plus, RotateCcw, Trash2, Waypoints } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import TextField from '@/components/form/TextField.vue'

import type { Pipeline, StageInput } from '@/features/crm/pipelines/api/pipelines.api'
import {
  useArchivePipelineMutation,
  useCreatePipelineMutation,
  useDeletePipelineMutation,
  usePipelinesQuery,
  useReplaceStagesMutation,
  useRestorePipelineMutation,
} from '@/features/crm/pipelines/api/pipelines.queries'

const params = computed(() => ({ page: 1, per_page: 50, include_archived: true }))
const pipelinesQuery = usePipelinesQuery(params)
const createMutation = useCreatePipelineMutation()
const deleteMutation = useDeletePipelineMutation()
const restoreMutation = useRestorePipelineMutation()
const archiveMutation = useArchivePipelineMutation()
const replaceStagesMutation = useReplaceStagesMutation()

const pipelines = computed(() => pipelinesQuery.data.value?.data ?? [])

function extractError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    if (response?.data?.message) return response.data.message
  }
  return 'Terjadi kesalahan, silakan coba lagi.'
}

// --- Create pipeline modal ---
const isCreateModalOpen = ref(false)
const createErrorMessage = ref('')
const createForm = reactive({ name: '' })
const createStages = ref<StageInput[]>([
  { name: 'New', position: 0, probability: '10', is_won: false, is_lost: false },
  { name: 'Won', position: 1, probability: '100', is_won: true, is_lost: false },
  { name: 'Lost', position: 2, probability: '0', is_won: false, is_lost: true },
])

function openCreateModal() {
  createForm.name = ''
  createErrorMessage.value = ''
  isCreateModalOpen.value = true
}

function addCreateStage() {
  createStages.value.push({
    name: '',
    position: createStages.value.length,
    probability: '0',
    is_won: false,
    is_lost: false,
  })
}

function removeCreateStage(index: number) {
  createStages.value.splice(index, 1)
}

async function submitCreate() {
  createErrorMessage.value = ''
  try {
    await createMutation.mutateAsync({
      name: createForm.name,
      stages: createStages.value.map((stage, index) => ({ ...stage, position: index })),
    })
    isCreateModalOpen.value = false
  } catch (error) {
    createErrorMessage.value = extractError(error)
  }
}

// --- Stage editor modal (existing pipeline) ---
const isStageModalOpen = ref(false)
const editingPipeline = ref<Pipeline | null>(null)
const stageErrorMessage = ref('')
const editStages = ref<StageInput[]>([])

function openStageModal(pipeline: Pipeline) {
  editingPipeline.value = pipeline
  editStages.value = pipeline.stages.map((stage) => ({ ...stage }))
  stageErrorMessage.value = ''
  isStageModalOpen.value = true
}

function addEditStage() {
  editStages.value.push({
    name: '',
    position: editStages.value.length,
    probability: '0',
    is_won: false,
    is_lost: false,
  })
}

function removeEditStage(index: number) {
  editStages.value.splice(index, 1)
}

async function submitStages() {
  if (!editingPipeline.value) return
  stageErrorMessage.value = ''
  try {
    await replaceStagesMutation.mutateAsync({
      id: editingPipeline.value.id,
      stages: editStages.value.map((stage, index) => ({ ...stage, position: index })),
    })
    isStageModalOpen.value = false
  } catch (error) {
    stageErrorMessage.value = extractError(error)
  }
}

async function handleDelete(pipeline: Pipeline) {
  if (!confirm(`Hapus pipeline "${pipeline.name}"?`)) return
  await deleteMutation.mutateAsync(pipeline.id)
}

async function handleRestore(pipeline: Pipeline) {
  await restoreMutation.mutateAsync(pipeline.id)
}

async function handleArchive(pipeline: Pipeline) {
  await archiveMutation.mutateAsync(pipeline.id)
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Pipelines"
      description="Kelola tahapan penjualan (sales stages) per pipeline."
    >
      <BaseButton @click="openCreateModal">
        <Plus class="size-4" />
        Pipeline Baru
      </BaseButton>
    </PageHeader>

    <div v-if="pipelinesQuery.isPending.value" class="p-12 text-center text-sm text-gray-500">
      Memuat data...
    </div>
    <div v-else-if="pipelinesQuery.isError.value" class="p-12 text-center">
      <p class="font-semibold text-red-700">Data pipeline tidak dapat dimuat.</p>
      <button class="mt-2 text-sm font-medium text-brand-600" @click="pipelinesQuery.refetch()">
        Coba lagi
      </button>
    </div>
    <div v-else-if="pipelines.length === 0" class="p-12 text-center text-sm text-gray-500">
      <Waypoints class="mx-auto mb-3 size-8 text-gray-300" />
      Belum ada pipeline.
    </div>
    <div v-else class="grid gap-4 md:grid-cols-2">
      <BaseCard v-for="pipeline in pipelines" :key="pipeline.id" class="space-y-3">
        <div class="flex items-start justify-between">
          <div>
            <h3 class="font-semibold">{{ pipeline.name }}</h3>
            <div class="mt-1 flex gap-2">
              <span
                v-if="pipeline.is_default"
                class="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600"
              >
                Default
              </span>
              <span
                v-if="pipeline.archived_at"
                class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500"
              >
                Archived
              </span>
              <span
                v-if="pipeline.deleted_at"
                class="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600"
              >
                Deleted
              </span>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <span
            v-for="stage in pipeline.stages"
            :key="stage.id"
            class="rounded-full border px-2.5 py-1 text-xs font-medium"
            :class="{
              'border-emerald-200 bg-emerald-50 text-emerald-700': stage.is_won,
              'border-red-200 bg-red-50 text-red-700': stage.is_lost,
              'border-gray-200 bg-gray-50 text-gray-600': !stage.is_won && !stage.is_lost,
            }"
          >
            {{ stage.name }}
          </span>
        </div>

        <div class="flex flex-wrap gap-2 pt-2">
          <template v-if="!pipeline.deleted_at">
            <BaseButton variant="outline" @click="openStageModal(pipeline)"
              >Kelola Stage</BaseButton
            >
            <BaseButton
              v-if="!pipeline.archived_at"
              variant="secondary"
              @click="handleArchive(pipeline)"
            >
              <Archive class="size-4" />
              Archive
            </BaseButton>
            <BaseButton variant="danger" @click="handleDelete(pipeline)">
              <Trash2 class="size-4" />
            </BaseButton>
          </template>
          <BaseButton v-else variant="secondary" @click="handleRestore(pipeline)">
            <RotateCcw class="size-4" />
            Restore
          </BaseButton>
        </div>
      </BaseCard>
    </div>

    <BaseModal :open="isCreateModalOpen" title="Pipeline Baru" @close="isCreateModalOpen = false">
      <form class="space-y-4" @submit.prevent="submitCreate">
        <TextField
          v-model="createForm.name"
          name="name"
          label="Nama Pipeline"
          placeholder="Sales Pipeline"
        />

        <div class="space-y-2">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Stages</span>
          <div v-for="(stage, index) in createStages" :key="index" class="flex items-center gap-2">
            <input
              v-model="stage.name"
              type="text"
              placeholder="Nama stage"
              class="flex-1 rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
            />
            <input
              v-model="stage.probability"
              type="text"
              placeholder="%"
              class="w-16 rounded-lg border bg-white px-2 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
            />
            <label class="flex items-center gap-1 text-xs text-gray-500">
              <input v-model="stage.is_won" type="checkbox" />
              Won
            </label>
            <label class="flex items-center gap-1 text-xs text-gray-500">
              <input v-model="stage.is_lost" type="checkbox" />
              Lost
            </label>
            <button
              type="button"
              class="text-gray-400 hover:text-red-600"
              @click="removeCreateStage(index)"
            >
              <Trash2 class="size-4" />
            </button>
          </div>
          <BaseButton type="button" variant="outline" @click="addCreateStage">
            <Plus class="size-4" />
            Tambah Stage
          </BaseButton>
        </div>

        <p v-if="createErrorMessage" class="text-sm text-red-600">{{ createErrorMessage }}</p>

        <div class="flex justify-end gap-3 pt-2">
          <BaseButton type="button" variant="secondary" @click="isCreateModalOpen = false"
            >Batal</BaseButton
          >
          <BaseButton type="submit" :disabled="createMutation.isPending.value">
            {{ createMutation.isPending.value ? 'Menyimpan...' : 'Simpan' }}
          </BaseButton>
        </div>
      </form>
    </BaseModal>

    <BaseModal
      :open="isStageModalOpen"
      :title="`Kelola Stage — ${editingPipeline?.name ?? ''}`"
      @close="isStageModalOpen = false"
    >
      <form class="space-y-4" @submit.prevent="submitStages">
        <div class="space-y-2">
          <div v-for="(stage, index) in editStages" :key="index" class="flex items-center gap-2">
            <input
              v-model="stage.name"
              type="text"
              placeholder="Nama stage"
              class="flex-1 rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
            />
            <input
              v-model="stage.probability"
              type="text"
              placeholder="%"
              class="w-16 rounded-lg border bg-white px-2 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
            />
            <label class="flex items-center gap-1 text-xs text-gray-500">
              <input v-model="stage.is_won" type="checkbox" />
              Won
            </label>
            <label class="flex items-center gap-1 text-xs text-gray-500">
              <input v-model="stage.is_lost" type="checkbox" />
              Lost
            </label>
            <button
              type="button"
              class="text-gray-400 hover:text-red-600"
              @click="removeEditStage(index)"
            >
              <Trash2 class="size-4" />
            </button>
          </div>
          <BaseButton type="button" variant="outline" @click="addEditStage">
            <Plus class="size-4" />
            Tambah Stage
          </BaseButton>
        </div>

        <p v-if="stageErrorMessage" class="text-sm text-red-600">{{ stageErrorMessage }}</p>
        <p class="text-xs text-gray-500">
          Stage yang dihapus di sini akan disembunyikan (soft delete), bukan dihapus permanen — deal
          yang masih ada di stage tersebut tidak akan hilang.
        </p>

        <div class="flex justify-end gap-3 pt-2">
          <BaseButton type="button" variant="secondary" @click="isStageModalOpen = false"
            >Batal</BaseButton
          >
          <BaseButton type="submit" :disabled="replaceStagesMutation.isPending.value">
            {{ replaceStagesMutation.isPending.value ? 'Menyimpan...' : 'Simpan' }}
          </BaseButton>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
