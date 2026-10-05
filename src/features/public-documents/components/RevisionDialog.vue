<script setup lang="ts">
import { ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

import { REVISION_CATEGORIES, validateRevision } from '../utils/revision'

const props = defineProps<{
  open: boolean
  pending: boolean
  error: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', payload: { name: string; categories: string[]; note: string }): void
}>()

const name = ref('')
const categories = ref<string[]>([])
const note = ref('')
const localError = ref('')

watch(
  () => props.open,
  (open) => {
    if (open) localError.value = ''
  },
)

function submit() {
  if (props.pending) return
  const form = { name: name.value, categories: categories.value, note: note.value }
  const problem = validateRevision(form)
  localError.value = problem ?? ''
  if (!problem) {
    emit('submit', {
      name: name.value.trim(),
      categories: [...categories.value],
      note: note.value.trim(),
    })
  }
}
</script>

<template>
  <BaseModal :open="open" title="Minta revisi" @close="emit('close')">
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

      <fieldset>
        <legend class="text-sm font-medium text-gray-700 dark:text-gray-200">
          Bagian yang perlu direvisi
        </legend>
        <div class="mt-2 grid gap-2 sm:grid-cols-2">
          <label
            v-for="category in REVISION_CATEGORIES"
            :key="category.value"
            class="flex items-center gap-2.5 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
          >
            <input
              v-model="categories"
              type="checkbox"
              :value="category.value"
              class="size-4 rounded border-gray-300"
            />
            {{ category.label }}
          </label>
        </div>
      </fieldset>

      <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">
        Catatan
        <textarea
          v-model="note"
          rows="4"
          maxlength="2000"
          class="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900"
        ></textarea>
      </label>

      <p v-if="localError || error" class="text-sm text-red-600" role="alert">
        {{ localError || error }}
      </p>
      <div class="flex justify-end gap-3">
        <BaseButton variant="secondary" @click="emit('close')">Batal</BaseButton>
        <BaseButton type="submit" :disabled="pending">Kirim permintaan revisi</BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
