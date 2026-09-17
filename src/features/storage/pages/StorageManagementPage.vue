<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Download, File as FileIcon, Trash2 } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import StorageUploader from '@/features/storage/components/StorageUploader.vue'
import {
  storageApi,
  type StorageObject,
  type StorageObjectClass,
  type StorageUsage,
} from '@/features/storage/api/storage.api'
import { formatBytes } from '@/features/storage/utils/formatBytes'
import { formatDate } from '@/lib/utils'

const objects = ref<StorageObject[]>([])
const usage = ref<StorageUsage | null>(null)
const loading = ref(false)
const uploading = ref(false)
const busyId = ref('')
const errorMessage = ref('')
const notice = ref('')

const usagePercent = computed(() => {
  if (!usage.value?.limit_bytes) return null
  if (usage.value.limit_bytes <= 0) return 0
  return Math.min(100, Math.round((usage.value.used_bytes / usage.value.limit_bytes) * 100))
})

onMounted(load)

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [objectList, usageResult] = await Promise.all([storageApi.list(), storageApi.getUsage()])
    objects.value = objectList
    usage.value = usageResult
  } catch {
    errorMessage.value = 'Gagal memuat data storage.'
  } finally {
    loading.value = false
  }
}

function showNotice(message: string) {
  notice.value = message
  window.setTimeout(() => {
    if (notice.value === message) notice.value = ''
  }, 3000)
}

function apiMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message ?? fallback
  }
  return fallback
}

async function handleUpload(file: File, options: { class: StorageObjectClass }) {
  uploading.value = true
  errorMessage.value = ''
  try {
    await storageApi.upload(file, options)
    showNotice('File berhasil diunggah.')
    await load()
  } catch (error) {
    errorMessage.value = apiMessage(error, 'Gagal mengunggah file.')
  } finally {
    uploading.value = false
  }
}

async function handleDownload(object: StorageObject) {
  busyId.value = object.id
  errorMessage.value = ''
  try {
    const result = await storageApi.download(object.id)
    window.open(result.download_url, '_blank', 'noopener,noreferrer')
  } catch (error) {
    errorMessage.value = apiMessage(error, 'Gagal membuat link unduhan.')
  } finally {
    busyId.value = ''
  }
}

async function handleDelete(object: StorageObject) {
  busyId.value = object.id
  errorMessage.value = ''
  try {
    await storageApi.delete(object.id)
    showNotice(`${object.filename} berhasil dihapus.`)
    await load()
  } catch (error) {
    errorMessage.value = apiMessage(error, 'Gagal menghapus file.')
  } finally {
    busyId.value = ''
  }
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Storage"
      description="Kelola file yang tersimpan untuk workspace ini — dokumen, gambar, dan file lain di luar konten landing page."
    />

    <div
      v-if="notice"
      class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-200"
    >
      {{ notice }}
    </div>
    <div
      v-if="errorMessage"
      class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200"
    >
      {{ errorMessage }}
    </div>

    <BaseCard v-if="usage">
      <div class="flex items-center justify-between text-sm">
        <span class="font-semibold text-gray-900 dark:text-gray-100">Pemakaian storage</span>
        <span class="text-gray-500">
          {{ formatBytes(usage.used_bytes) }}
          <template v-if="usage.limit_bytes"> / {{ formatBytes(usage.limit_bytes) }}</template>
          <template v-else> (tanpa batas)</template>
        </span>
      </div>
      <div
        v-if="usagePercent !== null"
        class="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
      >
        <div
          class="h-full rounded-full transition-all"
          :class="usagePercent >= 90 ? 'bg-red-500' : 'bg-brand-500'"
          :style="{ width: `${usagePercent}%` }"
        />
      </div>
    </BaseCard>

    <BaseCard>
      <StorageUploader :uploading="uploading" @upload="handleUpload" />
    </BaseCard>

    <BaseCard>
      <h2 class="mb-4 font-semibold text-gray-900 dark:text-gray-100">File tersimpan</h2>
      <p v-if="loading" class="text-sm text-gray-500">Memuat...</p>
      <p v-else-if="!objects.length" class="text-sm text-gray-500">Belum ada file yang diunggah.</p>
      <div v-else class="space-y-2">
        <div
          v-for="object in objects"
          :key="object.id"
          class="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 dark:border-gray-800"
        >
          <div class="flex min-w-0 items-center gap-3">
            <FileIcon class="size-5 shrink-0 text-gray-400" />
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ object.filename }}
              </p>
              <p class="text-xs text-gray-500">
                {{ formatBytes(object.size_bytes) }} · {{ object.class }} ·
                {{ formatDate(object.created_at) }}
              </p>
            </div>
          </div>
          <div class="flex shrink-0 gap-2">
            <button
              type="button"
              class="rounded-lg border p-2 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
              title="Download"
              :disabled="busyId === object.id"
              @click="handleDownload(object)"
            >
              <Download class="size-4" />
            </button>
            <button
              type="button"
              class="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
              title="Hapus"
              :disabled="busyId === object.id"
              @click="handleDelete(object)"
            >
              <Trash2 class="size-4" />
            </button>
          </div>
        </div>
      </div>
    </BaseCard>
  </div>
</template>
