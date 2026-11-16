<script setup lang="ts">
import { ref, watch } from 'vue'

import ContactPicker from '@/features/crm/components/ContactPicker.vue'
import type { ContactRef } from '@/features/crm/contacts/api/contacts.api'

// Pemilih kontak untuk deal (baru dan edit). v-model = contact_id ('' = tanpa kontak).
const props = defineProps<{ modelValue: string; contactName?: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', id: string): void }>()

const name = ref(props.contactName ?? '')
watch(
  () => props.contactName,
  (value) => {
    if (value) name.value = value
  },
)

function pick(contact: ContactRef) {
  name.value = contact.name
  emit('update:modelValue', contact.id)
}
function clear() {
  name.value = ''
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="space-y-2">
    <p v-if="modelValue" class="flex items-center gap-2 text-sm">
      <span class="font-medium">{{ name || 'Kontak terpilih' }}</span>
      <button
        type="button"
        class="text-xs text-brand-600"
        data-testid="clear-contact"
        @click="clear"
      >
        Ganti
      </button>
    </p>
    <ContactPicker v-else @pick="pick" />
  </div>
</template>
