<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import type { UserDetail } from '@/features/users/api/users.api'

const props = defineProps<{
  isOpen: boolean
  user: UserDetail | null
  actionType: 'suspend' | 'ban' | null
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: { id: string; status: string; reason: string }]
}>()

const reason = ref('')
const error = ref('')

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      reason.value = ''
      error.value = ''
    }
  },
)

const title = computed(() => {
  if (props.actionType === 'ban') return 'Ban Pengguna'
  return 'Tangguhkan Pengguna (Suspend)'
})

const description = computed(() => {
  if (props.actionType === 'ban') {
    return `Apakah Anda yakin ingin mem-ban ${props.user?.name || 'pengguna ini'}? Aksi ini akan mencabut seluruh sesi aktif dan mencegah pengguna masuk kembali.`
  }
  return `Apakah Anda yakin ingin menangguhkan (suspend) ${props.user?.name || 'pengguna ini'}? Pengguna tidak akan dapat mengakses workspace sampai diaktifkan kembali.`
})

function handleSubmit() {
  if (!reason.value.trim()) {
    error.value = 'Alasan penangguhan/ban wajib diisi.'
    return
  }
  if (!props.user || !props.actionType) return

  emit('submit', {
    id: props.user.id,
    status: props.actionType === 'ban' ? 'banned' : 'suspended',
    reason: reason.value.trim(),
  })
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-xl dark:bg-gray-900 transition-all"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b px-6 py-4">
        <h2 class="text-lg font-bold text-red-600 dark:text-red-500">
          {{ title }}
        </h2>
        <button
          class="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
          @click="emit('close')"
        >
          <X class="size-5" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ description }}
        </p>

        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Alasan (Reason) <span class="text-red-500">*</span>
          </span>
          <textarea
            v-model="reason"
            rows="3"
            placeholder="Masukkan alasan penangguhan atau ban..."
            class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-gray-400 focus:border-red-500 dark:bg-gray-950"
            :class="{ 'border-red-500': error }"
          />
          <span v-if="error" class="mt-1 block text-xs text-red-600">{{ error }}</span>
        </label>
      </div>

      <!-- Action Buttons -->
      <div
        class="flex items-center justify-end gap-3 border-t px-6 py-4 bg-gray-50 dark:bg-gray-900/50"
      >
        <BaseButton variant="secondary" @click="emit('close')"> Batal </BaseButton>
        <BaseButton variant="danger" @click="handleSubmit"> Konfirmasi </BaseButton>
      </div>
    </div>
  </div>
</template>
