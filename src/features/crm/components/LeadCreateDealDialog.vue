<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import DealFormFields from '@/features/crm/components/DealFormFields.vue'
import type { Deal } from '@/features/crm/deals/api/deals.api'
import type { Lead } from '@/features/crm/leads/api/leads.api'
import {
  useCreateLeadDealMutation,
  useCrmMembersQuery,
} from '@/features/crm/leads/api/leads.queries'
import {
  buildDealInput,
  prefillDealForm,
  validateDealForm,
  type DealForm,
} from '@/features/crm/leads/utils/convert-form'
import { usePipelinesQuery } from '@/features/crm/pipelines/api/pipelines.queries'

const props = defineProps<{ lead: Lead | null }>()
const emit = defineEmits<{ close: []; created: [deal: Deal] }>()

const pipelinesQuery = usePipelinesQuery(ref({ page: 1, per_page: 100 }))
const pipelines = computed(() => pipelinesQuery.data.value?.data ?? [])
const membersQuery = useCrmMembersQuery()
const mutation = useCreateLeadDealMutation()
const form = ref<DealForm | null>(null)
const error = ref('')

watch(
  [() => props.lead?.id, () => pipelinesQuery.isSuccess.value],
  () => {
    if (props.lead && pipelinesQuery.isSuccess.value)
      form.value = prefillDealForm(props.lead, pipelines.value)
    error.value = ''
  },
  { immediate: true },
)

async function submit() {
  if (!props.lead || !form.value) return
  const invalid = validateDealForm(form.value)
  if (invalid) {
    error.value = invalid
    return
  }
  try {
    const { deal } = await mutation.mutateAsync({
      id: props.lead.id,
      payload: buildDealInput(form.value),
    })
    emit('created', deal)
  } catch {
    error.value = 'Deal gagal dibuat. Coba lagi.'
  }
}
</script>

<template>
  <BaseModal :open="Boolean(lead)" title="Buat deal dari lead ini" @close="emit('close')">
    <p v-if="!form" class="text-sm text-gray-500">Memuat…</p>
    <form v-else class="max-h-[75vh] space-y-4 overflow-y-auto" @submit.prevent="submit">
      <p v-if="!form.pipelineId" class="text-sm text-gray-500">Belum ada pipeline aktif.</p>
      <DealFormFields
        v-else
        v-model="form"
        :pipelines="pipelines"
        :members="membersQuery.data.value ?? []"
      />
      <p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>
      <div class="flex justify-end gap-2">
        <BaseButton type="button" variant="secondary" @click="emit('close')">Batal</BaseButton>
        <BaseButton type="submit" :disabled="mutation.isPending.value || !form.pipelineId"
          >Buat deal</BaseButton
        >
      </div>
    </form>
  </BaseModal>
</template>
