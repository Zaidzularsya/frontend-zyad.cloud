<script setup lang="ts">
import { reactive, ref } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import type { Lead } from '@/features/crm/leads/api/leads.api'
import { useUpdateLeadMutation } from '@/features/crm/leads/api/leads.queries'

const props = defineProps<{ lead: Lead }>()
const emit = defineEmits<{ saved: []; cancel: [] }>()

const mutation = useUpdateLeadMutation()
const form = reactive({
  requirement_summary: props.lead.requirement_summary ?? '',
  budget_estimate: props.lead.budget_estimate ?? '',
  target_date: props.lead.target_date ?? '',
  decision_maker: props.lead.decision_maker ?? '',
})
const error = ref('')

async function save() {
  error.value = ''
  if (form.budget_estimate && !/^\d{1,16}(\.\d{1,2})?$/.test(form.budget_estimate.trim())) {
    error.value = 'Budget harus angka, maksimal 2 desimal.'
    return
  }
  try {
    await mutation.mutateAsync({
      id: props.lead.id,
      payload: { ...form, budget_estimate: form.budget_estimate.trim() },
    })
    emit('saved')
  } catch {
    error.value = 'Form kebutuhan gagal disimpan.'
  }
}
</script>

<template>
  <form class="space-y-3 rounded-xl border p-4" @submit.prevent="save">
    <h3 class="font-semibold">Form kebutuhan</h3>
    <textarea
      v-model="form.requirement_summary"
      rows="3"
      placeholder="Kebutuhan"
      class="w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950"
    />
    <div class="grid gap-3 sm:grid-cols-2">
      <input
        v-model="form.budget_estimate"
        inputmode="decimal"
        placeholder="Estimasi budget (Rp)"
        class="rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950"
      />
      <input
        v-model="form.target_date"
        type="date"
        aria-label="Target waktu"
        class="rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950"
      />
    </div>
    <input
      v-model="form.decision_maker"
      placeholder="Pengambil keputusan"
      class="w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950"
    />
    <p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>
    <div class="flex justify-end gap-2">
      <BaseButton type="button" variant="secondary" @click="emit('cancel')">Batal</BaseButton>
      <BaseButton type="submit" :disabled="mutation.isPending.value">Simpan</BaseButton>
    </div>
  </form>
</template>
