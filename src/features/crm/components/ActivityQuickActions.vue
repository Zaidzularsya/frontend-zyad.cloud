<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { CalendarClock, ClipboardList, StickyNote } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import type { ActivityEntityType } from '@/features/crm/activities/api/activities.api'
import { useCreateActivityMutation } from '@/features/crm/activities/api/activities.queries'

// Tiga cara mencatat: catatan (selesai), log interaksi yang sudah terjadi
// (selesai), dan follow-up terjadwal (pending, due wajib).
const props = defineProps<{
  relatedEntityType: ActivityEntityType
  relatedEntityId: string
  defaultAssigneeId?: string
}>()

type Kind = 'note' | 'log' | 'followup'

const createMutation = useCreateActivityMutation()
const kind = ref<Kind | null>(null)
const error = ref('')
const form = reactive({ type: 'call', subject: '', description: '', when: '' })

const typeOptions = computed(() =>
  kind.value === 'followup'
    ? [
        { value: 'call', label: 'Telepon' },
        { value: 'meeting', label: 'Meeting' },
        { value: 'task', label: 'Task' },
      ]
    : [
        { value: 'call', label: 'Telepon' },
        { value: 'email', label: 'Email' },
        { value: 'meeting', label: 'Meeting' },
      ],
)

function open(next: Kind) {
  kind.value = next
  error.value = ''
  Object.assign(form, { type: 'call', subject: '', description: '', when: '' })
}

function extractError(e: unknown): string {
  const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
  return message || 'Terjadi kesalahan, silakan coba lagi.'
}

async function submit() {
  if (!kind.value) return
  error.value = ''
  if (!form.subject.trim()) {
    error.value = 'Subjek wajib diisi.'
    return
  }
  if (kind.value === 'followup' && (!form.when || new Date(form.when) <= new Date())) {
    error.value = 'Pilih waktu yang akan datang.'
    return
  }
  const isNote = kind.value === 'note'
  const isFollowup = kind.value === 'followup'
  try {
    await createMutation.mutateAsync({
      related_entity_type: props.relatedEntityType,
      related_entity_id: props.relatedEntityId,
      type: isNote ? 'note' : (form.type as 'call' | 'email' | 'meeting' | 'task'),
      subject: form.subject.trim(),
      description: form.description.trim() || undefined,
      status: isFollowup ? 'pending' : 'completed',
      // Log/catatan selesai saat dibuat (completed_at diisi server); hanya follow-up punya jadwal.
      due_at: isFollowup ? new Date(form.when).toISOString() : undefined,
      assignee_user_id: isFollowup ? props.defaultAssigneeId || undefined : undefined,
    })
    kind.value = null
  } catch (e) {
    error.value = extractError(e)
  }
}

defineExpose({ open })
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap gap-2">
      <BaseButton variant="outline" aria-label="Tambah catatan" @click="open('note')">
        <StickyNote class="size-4" /> Catatan
      </BaseButton>
      <BaseButton variant="outline" aria-label="Log aktivitas" @click="open('log')">
        <ClipboardList class="size-4" /> Log aktivitas
      </BaseButton>
      <BaseButton variant="outline" aria-label="Jadwalkan follow-up" @click="open('followup')">
        <CalendarClock class="size-4" /> Jadwalkan follow-up
      </BaseButton>
    </div>

    <form v-if="kind" class="space-y-3 rounded-xl border p-4" @submit.prevent="submit">
      <div v-if="kind !== 'note'" class="grid gap-3 sm:grid-cols-2">
        <select
          v-model="form.type"
          aria-label="Jenis aktivitas"
          class="rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950"
        >
          <option v-for="option in typeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <input
          v-if="kind === 'followup'"
          v-model="form.when"
          type="datetime-local"
          aria-label="Jatuh tempo"
          title="Jatuh tempo"
          data-test="when"
          class="rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950"
        />
      </div>
      <input
        v-model="form.subject"
        type="text"
        placeholder="Subjek"
        aria-label="Subjek"
        data-test="subject"
        class="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
      />
      <textarea
        v-model="form.description"
        rows="3"
        placeholder="Deskripsi (opsional)"
        aria-label="Deskripsi"
        class="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
      />
      <p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>
      <div class="flex justify-end gap-2">
        <BaseButton type="button" variant="secondary" @click="kind = null">Batal</BaseButton>
        <BaseButton type="submit" :disabled="createMutation.isPending.value">
          {{ createMutation.isPending.value ? 'Menyimpan...' : 'Simpan' }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>
