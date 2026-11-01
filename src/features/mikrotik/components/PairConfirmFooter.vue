<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'

defineProps<{ count: number; total: number; loading?: boolean }>()
defineEmits<{ (e: 'confirm'): void }>()
</script>

<template>
  <div
    class="sticky bottom-0 z-10 flex items-center justify-between gap-4 border-t bg-white px-5 py-3 shadow-[0_-2px_6px_rgba(0,0,0,0.06)] dark:bg-gray-900"
    role="region"
    aria-label="Konfirmasi pasangan"
  >
    <p class="text-sm text-gray-600 dark:text-gray-300" aria-live="polite">
      <template v-if="count > 0">{{ count }} dari {{ total }} baris dipilih</template>
      <template v-else>Pilih data untuk dipasangkan</template>
    </p>
    <BaseButton :disabled="count === 0 || loading" @click="$emit('confirm')">
      Konfirmasi {{ count }} Pasangan
    </BaseButton>
  </div>
</template>
