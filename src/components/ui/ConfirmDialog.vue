<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

// Replaces window.confirm(): same look as the rest of the app, closable with
// Escape (via BaseModal), and able to show a pending state while the action
// runs.
withDefaults(
  defineProps<{
    open: boolean
    title: string
    message: string
    confirmLabel: string
    cancelLabel?: string
    tone?: 'danger' | 'default'
    loading?: boolean
  }>(),
  { cancelLabel: 'Batal', tone: 'default', loading: false },
)

defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <BaseModal :open="open" :title="title" @close="$emit('cancel')">
    <p class="text-sm text-gray-600 dark:text-gray-300">{{ message }}</p>
    <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <BaseButton variant="outline" :disabled="loading" @click="$emit('cancel')">
        {{ cancelLabel }}
      </BaseButton>
      <BaseButton
        :variant="tone === 'danger' ? 'danger' : 'primary'"
        :disabled="loading"
        @click="$emit('confirm')"
      >
        {{ loading ? 'Memproses...' : confirmLabel }}
      </BaseButton>
    </div>
  </BaseModal>
</template>
