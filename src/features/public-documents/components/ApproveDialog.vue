<script setup lang="ts">
import { ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

import { validateApprove } from '../utils/revision'

const props = defineProps<{
  open: boolean
  pending: boolean
  error: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', name: string): void
}>()

const name = ref('')
const agree = ref(false)
const localError = ref('')

watch(
  () => props.open,
  (open) => {
    if (open) {
      agree.value = false
      localError.value = ''
    }
  },
)

function submit() {
  if (props.pending) return
  const problem = validateApprove({ name: name.value, agree: agree.value })
  localError.value = problem ?? ''
  if (!problem) emit('submit', name.value.trim())
}
</script>

<template>
  <BaseModal :open="open" title="Setujui penawaran" @close="emit('close')">
    <form class="space-y-4" novalidate @submit.prevent="submit">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">
        Nama Anda
        <input
          v-model="name"
          name="responder_name"
          type="text"
          autocomplete="name"
          maxlength="150"
          class="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
      </label>
      <label class="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-200">
        <input v-model="agree" type="checkbox" class="mt-0.5 size-4 rounded border-gray-300" />
        <span>Saya menyetujui penawaran ini</span>
      </label>
      <p v-if="localError || error" class="text-sm text-red-600" role="alert">
        {{ localError || error }}
      </p>
      <div class="flex justify-end gap-3">
        <BaseButton variant="secondary" @click="emit('close')">Batal</BaseButton>
        <BaseButton type="submit" :disabled="pending">Setujui penawaran</BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
