<script setup lang="ts">
import { ref } from 'vue'
import { UploadCloud } from 'lucide-vue-next'

import type { StorageObjectClass } from '@/features/storage/api/storage.api'

const props = withDefaults(
  defineProps<{
    uploading?: boolean
    defaultClass?: StorageObjectClass
  }>(),
  {
    uploading: false,
    defaultClass: 'private',
  },
)

const emit = defineEmits<{
  upload: [file: File, options: { class: StorageObjectClass }]
}>()

const isDragging = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const objectClass = ref<StorageObjectClass>(props.defaultClass)

function pickFile() {
  inputRef.value?.click()
}

function onDrop(event: DragEvent) {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) emit('upload', file, { class: objectClass.value })
}

function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) emit('upload', file, { class: objectClass.value })
  ;(event.target as HTMLInputElement).value = ''
}
</script>

<template>
  <div
    class="rounded-2xl border-2 border-dashed p-6 text-center transition"
    :class="
      isDragging
        ? 'border-brand-400 bg-brand-50/50 dark:bg-brand-950/20'
        : 'border-gray-300 dark:border-gray-700'
    "
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="onDrop"
  >
    <UploadCloud class="mx-auto mb-3 size-8 text-gray-400" />
    <p class="text-sm text-gray-600 dark:text-gray-300">
      Tarik file ke sini, atau
      <button
        type="button"
        class="font-semibold text-brand-600 hover:underline"
        :disabled="uploading"
        @click="pickFile"
      >
        pilih file
      </button>
    </p>
    <p class="mt-1 text-xs text-gray-400">Gambar (JPG/PNG/WebP) atau PDF, maksimal 10MB.</p>

    <label class="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
      <input v-model="objectClass" type="checkbox" true-value="public" false-value="private" />
      Jadikan public (bisa diakses tanpa login)
    </label>

    <p v-if="uploading" class="mt-3 text-sm font-medium text-brand-600">Mengunggah...</p>

    <input
      ref="inputRef"
      type="file"
      class="hidden"
      accept="image/jpeg,image/png,image/webp,application/pdf"
      :disabled="uploading"
      @change="onFileChange"
    />
  </div>
</template>
