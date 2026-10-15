<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import type { Activity, CompleteActivityResult } from '@/features/crm/activities/api/activities.api'
import { useCompleteWithOutcomeMutation } from '@/features/crm/activities/api/activities.queries'
import type { DisqualifyReason } from '@/features/crm/leads/api/leads.api'
import {
  buildCompletePayload,
  disqualifyReasonLabels,
  emptyOutcomeForm,
  stepLabel,
  validateOutcomeForm,
} from '@/features/crm/leads/utils/lead-playbook'

const props = defineProps<{ activity: Activity | null }>()
const emit = defineEmits<{ close: []; completed: [result: CompleteActivityResult] }>()

const mutation = useCompleteWithOutcomeMutation()
const selectedKey = ref('')
const form = reactive(emptyOutcomeForm())
const error = ref('')

const options = computed(() => props.activity?.playbook?.outcomes ?? [])
const selected = computed(() => options.value.find((o) => o.key === selectedKey.value) ?? null)
const title = computed(() =>
  props.activity?.playbook ? `Selesaikan: ${stepLabel(props.activity.playbook)}` : '',
)
const reasons = Object.entries(disqualifyReasonLabels) as [DisqualifyReason, string][]

watch(
  () => props.activity?.id,
  () => {
    selectedKey.value = ''
    Object.assign(form, emptyOutcomeForm())
    error.value = ''
  },
  { immediate: true },
)

function extractError(e: unknown) {
  const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
  return message || 'Gagal menyimpan hasil. Coba lagi.'
}

async function submit() {
  error.value = validateOutcomeForm(selected.value, form) ?? ''
  if (error.value || !selected.value || !props.activity) return
  try {
    const result = await mutation.mutateAsync({
      id: props.activity.id,
      payload: buildCompletePayload(selected.value, form),
    })
    emit('completed', result)
  } catch (e) {
    error.value = extractError(e)
  }
}
</script>

<template>
  <BaseModal :open="Boolean(activity?.playbook)" :title="title" @close="emit('close')">
    <form class="space-y-4" @submit.prevent="submit">
      <fieldset class="space-y-2">
        <legend class="text-sm font-medium">Hasil</legend>
        <label
          v-for="option in options"
          :key="option.key"
          class="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm has-[:checked]:border-brand-500"
        >
          <input v-model="selectedKey" type="radio" name="outcome" :value="option.key" />
          {{ option.label }}
        </label>
      </fieldset>

      <div v-if="selected?.required_input === 'reschedule'" class="space-y-1">
        <label class="text-sm font-medium" for="outcome-reschedule">Hubungi lagi pada</label>
        <input
          id="outcome-reschedule"
          v-model="form.rescheduleAt"
          type="datetime-local"
          class="w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950"
        />
      </div>

      <div
        v-if="selected?.required_input === 'requirements'"
        data-test="requirements-fields"
        class="space-y-3"
      >
        <div>
          <label class="text-sm font-medium" for="outcome-summary">Kebutuhan *</label>
          <textarea
            id="outcome-summary"
            v-model="form.summary"
            data-test="summary"
            rows="3"
            class="w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950"
          />
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="text-sm font-medium" for="outcome-budget">Estimasi budget (Rp)</label>
            <input
              id="outcome-budget"
              v-model="form.budget"
              inputmode="decimal"
              class="w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950"
            />
          </div>
          <div>
            <label class="text-sm font-medium" for="outcome-target">Target waktu</label>
            <input
              id="outcome-target"
              v-model="form.targetDate"
              type="date"
              class="w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950"
            />
          </div>
        </div>
        <div>
          <label class="text-sm font-medium" for="outcome-dm">Pengambil keputusan</label>
          <input
            id="outcome-dm"
            v-model="form.decisionMaker"
            class="w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950"
          />
        </div>
      </div>

      <div
        v-if="selected?.required_input === 'disqualify'"
        data-test="disqualify-fields"
        class="space-y-3"
      >
        <div>
          <label class="text-sm font-medium" for="outcome-reason">Alasan *</label>
          <select
            id="outcome-reason"
            v-model="form.reason"
            class="w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950"
          >
            <option value="" disabled>Pilih alasan</option>
            <option v-for="[value, label] in reasons" :key="value" :value="value">
              {{ label }}
            </option>
          </select>
        </div>
        <textarea
          v-model="form.note"
          rows="2"
          placeholder="Catatan (opsional)"
          class="w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950"
        />
      </div>

      <p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>
      <div class="flex justify-end gap-2">
        <BaseButton type="button" variant="secondary" @click="emit('close')">Batal</BaseButton>
        <BaseButton type="submit" :disabled="mutation.isPending.value">
          {{ mutation.isPending.value ? 'Menyimpan...' : 'Simpan hasil' }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
