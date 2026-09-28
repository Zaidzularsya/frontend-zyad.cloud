<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Check, Plus, Search, X } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'

import type {
  Activity,
  ActivityEntityType,
  ActivityType,
  ManualActivityType,
} from '@/features/crm/activities/api/activities.api'
import {
  useActivitiesQuery,
  useCancelActivityMutation,
  useCompleteActivityMutation,
  useCreateActivityMutation,
} from '@/features/crm/activities/api/activities.queries'
import { formatDate } from '@/lib/utils'

// Timeline activity CRM untuk satu entity (lead, contact, ...): filter per
// tipe, composer, upcoming & history. openComposer di-expose supaya tombol
// "Log" di panel profil halaman induk bisa membukanya.
const props = defineProps<{
  relatedEntityType: ActivityEntityType
  relatedEntityId: string
  readonly?: boolean
}>()

function extractError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    if (response?.data?.message) return response.data.message
  }
  return 'Terjadi kesalahan, silakan coba lagi.'
}

const tabs: { value: ManualActivityType | 'all'; label: string }[] = [
  { value: 'all', label: 'Activity' },
  { value: 'note', label: 'Notes' },
  { value: 'email', label: 'Emails' },
  { value: 'call', label: 'Calls' },
  { value: 'task', label: 'Task' },
  { value: 'meeting', label: 'Meetings' },
]
const typeLabels: Record<ActivityType, string> = {
  call: 'Telepon',
  email: 'Email',
  meeting: 'Meeting',
  task: 'Task',
  note: 'Catatan',
  whatsapp: 'WhatsApp',
}
// The create form only offers types a user records by hand.
const manualTypeLabels: Record<ManualActivityType, string> = {
  call: typeLabels.call,
  email: typeLabels.email,
  meeting: typeLabels.meeting,
  task: typeLabels.task,
  note: typeLabels.note,
}

const activeTab = ref<ManualActivityType | 'all'>('all')
const activitySearch = ref('')

const activityParams = computed(() => ({
  page: 1,
  per_page: 100,
  related_entity_type: props.relatedEntityType,
  related_entity_id: props.relatedEntityId,
}))
const activitiesQuery = useActivitiesQuery(activityParams)

const filteredActivities = computed(() => {
  const keyword = activitySearch.value.trim().toLowerCase()
  return (activitiesQuery.data.value?.data ?? []).filter((activity) => {
    if (activity.deleted_at) return false
    if (activeTab.value !== 'all' && activity.type !== activeTab.value) return false
    if (!keyword) return true
    return `${activity.subject} ${activity.description ?? ''}`.toLowerCase().includes(keyword)
  })
})

// Catatan tidak punya konsep "jadwal", jadi selalu masuk history.
function isUpcoming(activity: Activity) {
  return activity.status === 'pending' && activity.type !== 'note'
}
const upcoming = computed(() =>
  filteredActivities.value
    .filter(isUpcoming)
    .sort((a, b) => (a.due_at ?? '9999').localeCompare(b.due_at ?? '9999')),
)
const history = computed(() =>
  filteredActivities.value
    .filter((activity) => !isUpcoming(activity))
    .sort((a, b) => b.created_at.localeCompare(a.created_at)),
)

const createMutation = useCreateActivityMutation()
const completeMutation = useCompleteActivityMutation()
const cancelMutation = useCancelActivityMutation()

const composerOpen = ref(false)
const composerError = ref('')
const composer = reactive({
  type: 'note' as ManualActivityType,
  subject: '',
  description: '',
  due_at: '',
})

function openComposer(type: ManualActivityType) {
  Object.assign(composer, { type, subject: '', description: '', due_at: '' })
  composerError.value = ''
  composerOpen.value = true
}

async function submitActivity() {
  composerError.value = ''
  if (!composer.subject.trim()) {
    composerError.value = 'Subjek wajib diisi.'
    return
  }
  try {
    await createMutation.mutateAsync({
      related_entity_type: props.relatedEntityType,
      related_entity_id: props.relatedEntityId,
      type: composer.type,
      subject: composer.subject.trim(),
      description: composer.description.trim() || undefined,
      due_at: composer.due_at ? new Date(composer.due_at).toISOString() : undefined,
    })
    composerOpen.value = false
  } catch (error) {
    composerError.value = extractError(error)
  }
}

defineExpose({ openComposer })
</script>

<template>
  <div class="space-y-4">
    <label class="relative block">
      <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
      <input
        v-model="activitySearch"
        type="search"
        placeholder="Cari activity, notes, email..."
        class="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
      />
    </label>

    <div class="flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1 dark:bg-gray-900">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium"
        :class="
          activeTab === tab.value
            ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white'
            : 'text-gray-500 hover:text-gray-700'
        "
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="!readonly" class="flex justify-end">
      <BaseButton variant="outline" @click="openComposer(activeTab === 'all' ? 'note' : activeTab)">
        <Plus class="size-4" />
        Tambah {{ activeTab === 'all' ? 'activity' : typeLabels[activeTab].toLowerCase() }}
      </BaseButton>
    </div>

    <form
      v-if="composerOpen"
      class="space-y-3 rounded-xl border p-4"
      @submit.prevent="submitActivity"
    >
      <div class="grid gap-3 sm:grid-cols-2">
        <select
          v-model="composer.type"
          class="rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950"
        >
          <option v-for="(label, value) in manualTypeLabels" :key="value" :value="value">
            {{ label }}
          </option>
        </select>
        <input
          v-model="composer.due_at"
          type="datetime-local"
          class="rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950"
          :disabled="composer.type === 'note'"
        />
      </div>
      <input
        v-model="composer.subject"
        type="text"
        placeholder="Subjek"
        class="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
      />
      <textarea
        v-model="composer.description"
        rows="3"
        placeholder="Deskripsi (opsional)"
        class="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
      />
      <p v-if="composerError" class="text-sm text-red-600">{{ composerError }}</p>
      <div class="flex justify-end gap-2">
        <BaseButton variant="secondary" @click="composerOpen = false">Batal</BaseButton>
        <BaseButton type="submit" :disabled="createMutation.isPending.value">
          {{ createMutation.isPending.value ? 'Menyimpan...' : 'Simpan' }}
        </BaseButton>
      </div>
    </form>

    <div v-if="activitiesQuery.isPending.value" class="py-8 text-center text-sm text-gray-500">
      Memuat activity...
    </div>
    <div v-else-if="activitiesQuery.isError.value" class="py-8 text-center text-sm text-red-700">
      Activity tidak dapat dimuat.
    </div>
    <template v-else>
      <section v-if="upcoming.length">
        <h2 class="mb-2 font-semibold">Upcoming Activity</h2>
        <ul class="space-y-2">
          <li v-for="activity in upcoming" :key="activity.id" class="rounded-xl border p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-xs text-gray-500">{{ typeLabels[activity.type] }}</p>
                <p class="font-medium">{{ activity.subject }}</p>
                <p v-if="activity.description" class="mt-1 text-sm text-gray-500">
                  {{ activity.description }}
                </p>
              </div>
              <div class="flex shrink-0 items-center gap-1">
                <span v-if="activity.due_at" class="mr-2 text-xs text-gray-500">
                  Due: {{ formatDate(activity.due_at) }}
                </span>
                <button
                  class="grid size-8 place-items-center rounded-lg text-emerald-600 hover:bg-emerald-50"
                  title="Tandai selesai"
                  :disabled="completeMutation.isPending.value"
                  @click="completeMutation.mutate(activity.id)"
                >
                  <Check class="size-4" />
                </button>
                <button
                  class="grid size-8 place-items-center rounded-lg text-red-600 hover:bg-red-50"
                  title="Batalkan"
                  :disabled="cancelMutation.isPending.value"
                  @click="cancelMutation.mutate(activity.id)"
                >
                  <X class="size-4" />
                </button>
              </div>
            </div>
          </li>
        </ul>
      </section>

      <section>
        <h2 class="mb-2 font-semibold">Activity History</h2>
        <p v-if="!history.length" class="py-4 text-sm text-gray-500">Belum ada activity.</p>
        <ul v-else class="space-y-2 border-l pl-4">
          <li v-for="activity in history" :key="activity.id" class="relative">
            <span class="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-gray-400" />
            <p class="text-xs text-gray-500">
              {{ typeLabels[activity.type] }} · {{ formatDate(activity.created_at) }}
              <template v-if="activity.status !== 'pending'"> · {{ activity.status }}</template>
            </p>
            <p class="font-medium">{{ activity.subject }}</p>
            <p v-if="activity.description" class="text-sm text-gray-500">
              {{ activity.description }}
            </p>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
