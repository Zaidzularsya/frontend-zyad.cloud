<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { CheckCircle2, FileClock, Plus, XCircle } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import TextField from '@/components/form/TextField.vue'

import type {
  Activity,
  ActivityEntityType,
  ActivityPayload,
  ActivityStatus,
  ActivityType,
} from '@/features/crm/activities/api/activities.api'
import {
  useActivitiesQuery,
  useCancelActivityMutation,
  useCompleteActivityMutation,
  useCreateActivityMutation,
} from '@/features/crm/activities/api/activities.queries'

const entityTypeLabels: Record<ActivityEntityType, string> = {
  lead: 'Lead',
  contact: 'Contact',
  company: 'Company',
  deal: 'Deal',
}

const typeLabels: Record<ActivityType, string> = {
  call: 'Telepon',
  email: 'Email',
  meeting: 'Meeting',
  task: 'Task',
  note: 'Catatan',
}

const statusFilter = ref<ActivityStatus | 'all'>('pending')
const entityTypeFilter = ref<ActivityEntityType | 'all'>('all')

const params = computed(() => ({
  page: 1,
  per_page: 50,
  status: statusFilter.value === 'all' ? undefined : statusFilter.value,
  related_entity_type: entityTypeFilter.value === 'all' ? undefined : entityTypeFilter.value,
}))

const activitiesQuery = useActivitiesQuery(params)
const activities = computed(() => activitiesQuery.data.value?.data ?? [])

const createMutation = useCreateActivityMutation()
const completeMutation = useCompleteActivityMutation()
const cancelMutation = useCancelActivityMutation()

function extractError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    if (response?.data?.message) return response.data.message
  }
  return 'Terjadi kesalahan, silakan coba lagi.'
}

async function handleComplete(activity: Activity) {
  await completeMutation.mutateAsync(activity.id)
}

async function handleCancel(activity: Activity) {
  if (!confirm(`Batalkan activity "${activity.subject}"?`)) return
  await cancelMutation.mutateAsync(activity.id)
}

function formatDueAt(activity: Activity) {
  if (!activity.due_at) return '-'
  return new Date(activity.due_at).toLocaleString('id-ID')
}

// --- Create modal ---
const isModalOpen = ref(false)
const errorMessage = ref('')
const form = reactive<ActivityPayload>({
  related_entity_type: 'lead',
  related_entity_id: '',
  type: 'task',
  subject: '',
  description: '',
})

function openCreateModal() {
  Object.assign(form, {
    related_entity_type: 'lead',
    related_entity_id: '',
    type: 'task',
    subject: '',
    description: '',
  })
  errorMessage.value = ''
  isModalOpen.value = true
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

watch([statusFilter, entityTypeFilter], () => {
  // params recomputed reactively; nothing else needed
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Activities" description="Riwayat interaksi (call/email/meeting/task/note).">
      <BaseButton @click="openCreateModal">
        <Plus class="size-4" />
        Activity Baru
      </BaseButton>
    </PageHeader>

    <div class="flex flex-wrap items-center gap-3">
      <select
        v-model="statusFilter"
        class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
      >
        <option value="all">Semua status</option>
        <option value="pending">Pending</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <select
        v-model="entityTypeFilter"
        class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
      >
        <option value="all">Semua entitas</option>
        <option v-for="(label, value) in entityTypeLabels" :key="value" :value="value">
          {{ label }}
        </option>
      </select>
    </div>

    <BaseCard class="!p-0">
      <div v-if="activitiesQuery.isPending.value" class="p-12 text-center text-sm text-gray-500">
        Memuat data...
      </div>
      <div v-else-if="activitiesQuery.isError.value" class="p-12 text-center">
        <p class="font-semibold text-red-700">Data activity tidak dapat dimuat.</p>
        <button class="mt-2 text-sm font-medium text-brand-600" @click="activitiesQuery.refetch()">
          Coba lagi
        </button>
      </div>
      <div v-else-if="activities.length === 0" class="p-12 text-center text-sm text-gray-500">
        <FileClock class="mx-auto mb-3 size-8 text-gray-300" />
        Belum ada activity.
      </div>
      <div v-else class="divide-y">
        <div
          v-for="activity in activities"
          :key="activity.id"
          class="flex items-start justify-between p-4"
        >
          <div>
            <div class="flex items-center gap-2">
              <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {{ typeLabels[activity.type] }}
              </span>
              <span class="rounded-full bg-gray-50 px-2 py-0.5 text-xs text-gray-500">
                {{ entityTypeLabels[activity.related_entity_type] }}
              </span>
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="{
                  'bg-amber-50 text-amber-700': activity.status === 'pending',
                  'bg-emerald-50 text-emerald-700': activity.status === 'completed',
                  'bg-gray-100 text-gray-500': activity.status === 'cancelled',
                }"
              >
                {{ activity.status }}
              </span>
            </div>
            <p class="mt-1 font-medium">{{ activity.subject }}</p>
            <p v-if="activity.description" class="text-sm text-gray-500">
              {{ activity.description }}
            </p>
            <p class="mt-1 text-xs text-gray-400">Due: {{ formatDueAt(activity) }}</p>
          </div>
          <div v-if="activity.status === 'pending'" class="flex flex-shrink-0 gap-2">
            <button
              class="text-emerald-600 hover:text-emerald-700"
              title="Selesai"
              @click="handleComplete(activity)"
            >
              <CheckCircle2 class="size-5" />
            </button>
            <button
              class="text-red-500 hover:text-red-600"
              title="Batal"
              @click="handleCancel(activity)"
            >
              <XCircle class="size-5" />
            </button>
          </div>
        </div>
      </div>
    </BaseCard>

    <BaseModal :open="isModalOpen" title="Activity Baru" @close="isModalOpen = false">
      <form class="space-y-4" @submit.prevent="submitForm">
        <div class="grid grid-cols-2 gap-4">
          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Entitas</span
            >
            <select
              v-model="form.related_entity_type"
              class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
            >
              <option v-for="(label, value) in entityTypeLabels" :key="value" :value="value">
                {{ label }}
              </option>
            </select>
          </label>
          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Tipe</span
            >
            <select
              v-model="form.type"
              class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
            >
              <option v-for="(label, value) in typeLabels" :key="value" :value="value">
                {{ label }}
              </option>
            </select>
          </label>
        </div>
        <TextField
          v-model="form.related_entity_id"
          name="related_entity_id"
          label="ID Entitas Terkait"
          placeholder="Salin ID dari halaman Leads/Contacts/Companies/Deals"
        />
        <TextField v-model="form.subject" name="subject" label="Subjek" />
        <TextField v-model="form.description" name="description" label="Deskripsi" />

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
