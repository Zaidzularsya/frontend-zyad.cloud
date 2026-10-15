<script setup lang="ts">
import { ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import type { DisqualifyReason, Lead } from '@/features/crm/leads/api/leads.api'
import { useDisqualifyLeadMutation } from '@/features/crm/leads/api/leads.queries'
import { disqualifyReasonLabels } from '@/features/crm/leads/utils/lead-playbook'

const props = defineProps<{ lead: Lead | null }>()
const emit = defineEmits<{ close: []; done: [] }>()

const mutation = useDisqualifyLeadMutation()
const reason = ref<DisqualifyReason | ''>('')
const note = ref('')
const error = ref('')
const reasons = Object.entries(disqualifyReasonLabels) as [DisqualifyReason, string][]

watch(
  () => props.lead?.id,
  () => {
    reason.value = ''
    note.value = ''
    error.value = ''
  },
)

async function submit() {
  if (!props.lead) return
  if (!reason.value) {
    error.value = 'Pilih alasan.'
    return
  }
  try {
    await mutation.mutateAsync({
      id: props.lead.id,
      reason: reason.value,
      note: note.value.trim() || undefined,
    })
    emit('done')
  } catch {
    error.value = 'Lead gagal di-unqualify. Coba lagi.'
  }
}
</script>

<template>
  <BaseModal :open="Boolean(lead)" title="Unqualify lead" @close="emit('close')">
    <form class="space-y-3" @submit.prevent="submit">
      <select
        v-model="reason"
        aria-label="Alasan"
        class="w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950"
      >
        <option value="" disabled>Pilih alasan</option>
        <option v-for="[value, label] in reasons" :key="value" :value="value">{{ label }}</option>
      </select>
      <textarea
        v-model="note"
        rows="2"
        placeholder="Catatan (opsional)"
        class="w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950"
      />
      <p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>
      <div class="flex justify-end gap-2">
        <BaseButton type="button" variant="secondary" @click="emit('close')">Batal</BaseButton>
        <BaseButton type="submit" :disabled="mutation.isPending.value">Unqualify</BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
