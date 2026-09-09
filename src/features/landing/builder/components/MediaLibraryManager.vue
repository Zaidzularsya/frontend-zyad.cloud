<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Loader2, Trash2, Upload } from 'lucide-vue-next'

import { landingApi } from '@/features/landing/shared/api/landing.api'
import type { LandingMedia } from '@/features/landing/shared/types/landing.types'

const items = ref<LandingMedia[]>([])
const loading = ref(false)
const uploading = ref(false)
const error = ref('')
const notice = ref('')

onMounted(() => {
  void load()
})

function apiMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  )
}

function flash(message: string) {
  notice.value = message
  window.setTimeout(() => {
    if (notice.value === message) notice.value = ''
  }, 3000)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    items.value = (await landingApi.getMedia({ per_page: 100 })).data
  } catch (err) {
    error.value = apiMessage(err, 'Gagal memuat media library.')
  } finally {
    loading.value = false
  }
}

async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploading.value = true
  error.value = ''
  try {
    const payload = new FormData()
    payload.append('file', file)
    await landingApi.uploadMedia(payload)
    flash('Media berhasil diupload.')
    await load()
  } catch (err) {
    error.value = apiMessage(err, 'Gagal mengupload media.')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

async function remove(media: LandingMedia) {
  if (!window.confirm(`Hapus media "${media.filename}"?`)) return
  error.value = ''
  try {
    await landingApi.deleteMedia(media.id)
    await load()
  } catch (err) {
    error.value = apiMessage(err, 'Gagal menghapus media.')
  }
}

async function copyUrl(media: LandingMedia) {
  if (!media.public_url) return
  await navigator.clipboard.writeText(media.public_url)
  flash('URL media disalin.')
}

function isImage(media: LandingMedia) {
  return Boolean(media.public_url) && media.mime_type.startsWith('image/')
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-4">
      <h3 class="font-black text-gray-900 dark:text-white">Media library</h3>
      <label
        class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
        :class="{ 'pointer-events-none opacity-60': uploading }"
      >
        <Loader2 v-if="uploading" class="size-4 animate-spin" />
        <Upload v-else class="size-4" />
        Upload media
        <input type="file" class="hidden" :disabled="uploading" @change="upload" />
      </label>
    </div>
    <p class="mt-1 text-sm text-gray-500">
      Upload gambar lalu salin URL-nya untuk dipakai di blok Image atau URL logo brand.
    </p>

    <p
      v-if="notice"
      class="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
    >
      {{ notice }}
    </p>
    <p
      v-if="error"
      class="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {{ error }}
    </p>

    <div class="mt-4 grid gap-3 md:grid-cols-2">
      <div
        v-for="media in items"
        :key="media.id"
        class="flex items-start justify-between gap-3 rounded-xl border p-3 dark:border-gray-800"
      >
        <div class="flex min-w-0 items-start gap-3">
          <img
            v-if="isImage(media)"
            :src="media.public_url"
            :alt="media.alt_text || media.filename"
            class="size-12 shrink-0 rounded-lg border object-contain dark:border-gray-800"
          />
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
              {{ media.filename }}
            </p>
            <p class="mt-1 text-xs text-gray-500">
              {{ media.mime_type }} · {{ formatBytes(media.size_bytes) }}
            </p>
            <button
              v-if="media.public_url"
              type="button"
              class="mt-2 rounded border px-2 py-0.5 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
              @click="copyUrl(media)"
            >
              Copy URL
            </button>
          </div>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          title="Hapus"
          @click="remove(media)"
        >
          <Trash2 class="size-4" />
        </button>
      </div>
      <p
        v-if="!loading && items.length === 0"
        class="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500 dark:border-gray-800 md:col-span-2"
      >
        Belum ada media.
      </p>
    </div>
  </div>
</template>
