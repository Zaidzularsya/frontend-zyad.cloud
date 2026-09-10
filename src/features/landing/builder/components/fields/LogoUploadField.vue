<script setup lang="ts">
import { ref } from 'vue'
import { ImageOff, Loader2, Upload } from 'lucide-vue-next'

import { landingApi } from '@/features/landing/shared/api/landing.api'

/**
 * Logo picker for the landing builder: upload an image (reuses the media
 * library endpoint) or paste a URL manually. Emits the resolved public URL as
 * a plain string so it stays compatible with both the tenant branding row and
 * the per-page header `content.logoUrl` override.
 */
withDefaults(
  defineProps<{
    modelValue?: string
    label?: string
    hint?: string
  }>(),
  { modelValue: '', label: 'Logo', hint: '' },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const uploading = ref(false)
const error = ref('')

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    error.value = 'File harus berupa gambar.'
    return
  }
  uploading.value = true
  error.value = ''
  try {
    const form = new FormData()
    form.append('file', file)
    const { data } = await landingApi.uploadMedia(form)
    if (data.public_url) emit('update:modelValue', data.public_url)
    else error.value = 'Upload berhasil, tapi URL publik belum tersedia.'
  } catch (err) {
    error.value =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      'Gagal mengupload logo.'
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div>
    <span class="text-xs font-medium text-gray-500">{{ label }}</span>
    <div class="mt-1 flex items-center gap-3">
      <span
        class="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
      >
        <img v-if="modelValue" :src="modelValue" alt="" class="size-full object-contain" />
        <ImageOff v-else class="size-4 text-gray-300" />
      </span>
      <div class="flex flex-wrap gap-2">
        <label
          class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          :class="{ 'pointer-events-none opacity-60': uploading }"
        >
          <Loader2 v-if="uploading" class="size-3.5 animate-spin" />
          <Upload v-else class="size-3.5" />
          {{ uploading ? 'Mengupload…' : 'Upload' }}
          <input
            type="file"
            accept="image/*"
            class="hidden"
            :disabled="uploading"
            @change="onFile"
          />
        </label>
        <button
          v-if="modelValue"
          type="button"
          class="rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          @click="emit('update:modelValue', '')"
        >
          Hapus
        </button>
      </div>
    </div>
    <input
      :value="modelValue"
      placeholder="atau tempel URL: /uploads/logo.png"
      class="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <p v-if="hint" class="mt-1 text-xs text-gray-400">{{ hint }}</p>
    <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
  </div>
</template>
