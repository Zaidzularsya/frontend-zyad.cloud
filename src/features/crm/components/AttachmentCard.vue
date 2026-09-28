<script setup lang="ts">
import { ref } from 'vue'
import { Download, Paperclip, Plus, Trash2 } from 'lucide-vue-next'

import BaseCard from '@/components/ui/BaseCard.vue'
import { formatDate } from '@/lib/utils'

// Kartu lampiran CRM (lead & contact). Presentational: query/mutation tetap
// di halaman pemilik entity, komponen ini hanya menampilkan list dan
// meneruskan aksi lewat event.
export interface AttachmentItem {
  id: string
  filename: string
  size_bytes: number
  created_at: string
}

defineProps<{
  attachments: AttachmentItem[]
  loading: boolean
  uploading: boolean
  deleting: boolean
  readonly?: boolean
  error?: string
}>()

const emit = defineEmits<{
  upload: [file: File]
  download: [attachment: AttachmentItem]
  remove: [attachment: AttachmentItem]
}>()

// Batas mengikuti modul asset backend (allowedObjectMimeTypes & 10MB).
const acceptedAttachmentTypes = 'image/jpeg,image/png,image/webp,application/pdf'
const fileInput = ref<HTMLInputElement | null>(null)

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) emit('upload', file)
}
</script>

<template>
  <BaseCard class="space-y-3 !p-5">
    <div class="flex items-center justify-between">
      <h2 class="font-semibold">
        Attachment
        <span v-if="attachments.length" class="ml-1 text-sm font-normal text-gray-500">
          {{ attachments.length }}
        </span>
      </h2>
      <button
        v-if="!readonly"
        class="inline-flex items-center gap-1 text-xs font-medium text-brand-600 disabled:opacity-60"
        :disabled="uploading"
        @click="fileInput?.click()"
      >
        <Plus class="size-3.5" />
        {{ uploading ? 'Mengunggah...' : 'Unggah' }}
      </button>
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        :accept="acceptedAttachmentTypes"
        @change="onFileSelected"
      />
    </div>
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    <p v-if="loading" class="text-sm text-gray-500">Memuat...</p>
    <p v-else-if="!attachments.length" class="text-sm text-gray-500">
      Belum ada lampiran. JPG, PNG, WEBP, atau PDF, maks 10MB.
    </p>
    <ul v-else class="space-y-2">
      <li
        v-for="attachment in attachments"
        :key="attachment.id"
        class="flex items-center gap-2 rounded-xl border p-2 text-sm"
      >
        <Paperclip class="size-4 shrink-0 text-gray-400" />
        <div class="min-w-0 flex-1">
          <p class="truncate font-medium" :title="attachment.filename">
            {{ attachment.filename }}
          </p>
          <p class="text-xs text-gray-500">
            {{ formatSize(attachment.size_bytes) }} · {{ formatDate(attachment.created_at) }}
          </p>
        </div>
        <button
          class="grid size-8 place-items-center rounded-lg text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Unduh"
          @click="emit('download', attachment)"
        >
          <Download class="size-4" />
        </button>
        <button
          v-if="!readonly"
          class="grid size-8 place-items-center rounded-lg text-red-600 hover:bg-red-50"
          title="Hapus"
          :disabled="deleting"
          @click="emit('remove', attachment)"
        >
          <Trash2 class="size-4" />
        </button>
      </li>
    </ul>
  </BaseCard>
</template>
