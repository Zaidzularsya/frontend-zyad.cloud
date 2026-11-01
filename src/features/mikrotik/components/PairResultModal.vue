<script setup lang="ts">
import { computed } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import type { PairBulkItemResult } from '@/features/mikrotik/types'

const props = defineProps<{
  open: boolean
  results: PairBulkItemResult[]
  secretNames: Record<string, string>
}>()
defineEmits<{ (e: 'close'): void }>()

const CODE_LABELS: Record<string, string> = {
  MIKROTIK_SECRET_ALREADY_PAIRED: 'Secret sudah terpasang ke pelanggan.',
  MIKROTIK_SECRET_NOT_FOUND: 'Secret tidak ditemukan.',
  MIKROTIK_SECRET_NOT_PAIRABLE: 'Secret belum bisa dipasangkan.',
}

const successCount = computed(() => props.results.filter((r) => r.ok).length)
const failed = computed(() => props.results.filter((r) => !r.ok))

function reason(r: PairBulkItemResult) {
  return r.message || CODE_LABELS[r.code] || 'Gagal dipasangkan.'
}
</script>

<template>
  <BaseModal :open="open" title="Hasil Pairing" @close="$emit('close')">
    <div class="grid grid-cols-2 gap-3 text-center">
      <div class="rounded-lg bg-green-50 p-4 dark:bg-green-950">
        <p class="text-2xl font-bold text-green-700">{{ successCount }} Pasangan Berhasil</p>
      </div>
      <div class="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-950">
        <p class="text-2xl font-bold text-yellow-700">{{ failed.length }} Pasangan Gagal</p>
      </div>
    </div>
    <ul v-if="failed.length" class="mt-4 max-h-60 space-y-2 overflow-y-auto text-sm">
      <li v-for="r in failed" :key="r.secret_id" class="rounded-lg border p-3">
        <span class="font-medium">{{ secretNames[r.secret_id] ?? r.secret_id }}</span>
        <span class="block text-gray-600 dark:text-gray-300">{{ reason(r) }}</span>
      </li>
    </ul>
    <div class="mt-6 flex justify-end">
      <BaseButton @click="$emit('close')">Tutup</BaseButton>
    </div>
  </BaseModal>
</template>
