<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import DealFormFields from '@/features/crm/components/DealFormFields.vue'
import { useCompanyLookupQuery } from '@/features/crm/companies/api/companies.queries'
import type { Lead, LeadConversionResult } from '@/features/crm/leads/api/leads.api'
import { useConvertLeadMutation, useCrmMembersQuery } from '@/features/crm/leads/api/leads.queries'
import {
  activePipelines,
  buildConvertPayload,
  prefillConvertForm,
  validateConvertForm,
  type ConvertForm,
} from '@/features/crm/leads/utils/convert-form'
import { usePipelinesQuery } from '@/features/crm/pipelines/api/pipelines.queries'

const props = defineProps<{ lead: Lead | null }>()
const emit = defineEmits<{ close: []; converted: [result: LeadConversionResult] }>()

const pipelinesQuery = usePipelinesQuery(ref({ page: 1, per_page: 100 }))
const pipelines = computed(() => pipelinesQuery.data.value?.data ?? [])
const hasPipeline = computed(() => activePipelines(pipelines.value).length > 0)
const membersQuery = useCrmMembersQuery()
const members = computed(() => membersQuery.data.value ?? [])
const mutation = useConvertLeadMutation()

const form = ref<ConvertForm | null>(null)
const error = ref('')

// Prefill sekali per lead, setelah pipeline termuat.
watch(
  [() => props.lead?.id, () => pipelinesQuery.isSuccess.value],
  () => {
    if (props.lead && pipelinesQuery.isSuccess.value)
      form.value = prefillConvertForm(props.lead, pipelines.value)
    error.value = ''
  },
  { immediate: true },
)

const lookupName = computed(() => (form.value?.companyMode === 'new' ? form.value.companyName : ''))
const similarQuery = useCompanyLookupQuery(lookupName)
const similar = computed(() => similarQuery.data.value ?? [])

// Nama company terpilih disimpan terpisah: setelah mode berpindah ke
// "existing", lookup nama berhenti sehingga daftar `similar` kosong.
const pickedName = ref('')

function useExisting(company: { id: string; name: string }) {
  if (!form.value) return
  form.value.companyMode = 'existing'
  form.value.companyId = company.id
  pickedName.value = company.name
}

function extractError(e: unknown): string {
  const data = (e as { response?: { data?: { code?: string; message?: string } } })?.response?.data
  const byCode: Record<string, string> = {
    INVALID_PIPELINE_STAGE: 'Pipeline atau stage tidak valid. Muat ulang lalu pilih lagi.',
    INVALID_START_STAGE: 'Deal tidak bisa dimulai di stage Won/Lost.',
    LEAD_ALREADY_CONVERTED: 'Lead ini sudah di-convert.',
    FORBIDDEN: 'Anda tidak punya izin membuat deal/company.',
  }
  return (data?.code && byCode[data.code]) || data?.message || 'Convert gagal. Coba lagi.'
}

async function submit() {
  if (!props.lead || !form.value) return
  const invalid = validateConvertForm(form.value)
  if (invalid) {
    error.value = invalid
    return
  }
  try {
    const result = await mutation.mutateAsync({
      id: props.lead.id,
      payload: buildConvertPayload(form.value),
    })
    emit('converted', result)
  } catch (e) {
    error.value = extractError(e)
  }
}

const field = 'w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950'
</script>

<template>
  <BaseModal
    :open="Boolean(lead)"
    :title="`Convert lead · ${lead?.contact_name ?? ''}`"
    @close="emit('close')"
  >
    <p v-if="!form" class="text-sm text-gray-500">Memuat…</p>
    <form v-else class="max-h-[75vh] space-y-4 overflow-y-auto" @submit.prevent="submit">
      <section class="rounded-lg border p-3 text-sm">
        <h3 class="font-semibold">Contact</h3>
        <p class="text-gray-600">
          {{ lead?.contact_name }} · {{ lead?.email || '-' }} · {{ lead?.phone || '-' }}
        </p>
      </section>

      <section class="space-y-2 rounded-lg border p-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold">
            Company <span class="font-normal text-gray-400">· opsional</span>
          </h3>
          <select
            v-model="form.companyMode"
            name="company-mode"
            class="rounded-lg border px-2 py-1 text-xs dark:bg-gray-950"
          >
            <option value="none">Tanpa company</option>
            <option value="new">Buat baru</option>
            <option value="existing">Pilih yang ada</option>
          </select>
        </div>
        <template v-if="form.companyMode === 'new'">
          <div class="grid gap-2 sm:grid-cols-2">
            <input
              v-model="form.companyName"
              name="company-name"
              placeholder="Nama company"
              :class="field"
            />
            <input v-model="form.industry" placeholder="Industri" :class="field" />
            <input v-model="form.website" placeholder="Website" :class="field" />
            <input v-model="form.phone" placeholder="Telepon kantor" :class="field" />
          </div>
          <div
            v-if="similar.length"
            class="rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200"
          >
            <p class="flex items-center gap-1">
              <AlertTriangle class="size-3.5" /> Mirip company yang sudah ada:
            </p>
            <button
              v-for="c in similar"
              :key="c.id"
              type="button"
              class="mt-1 block underline"
              @click="useExisting(c)"
            >
              Gunakan "{{ c.name }}"
            </button>
          </div>
        </template>
        <select
          v-else-if="form.companyMode === 'existing'"
          v-model="form.companyId"
          name="company-existing"
          :class="field"
        >
          <option value="" disabled>Pilih company</option>
          <option v-for="c in similar" :key="c.id" :value="c.id">{{ c.name }}</option>
          <option
            v-if="form.companyId && !similar.some((c) => c.id === form?.companyId)"
            :value="form.companyId"
          >
            {{ pickedName || 'Company terpilih' }}
          </option>
        </select>
      </section>

      <section class="space-y-3 rounded-lg border p-3">
        <label class="flex items-center gap-2 text-sm font-semibold">
          <input
            v-model="form.createDeal"
            name="create-deal"
            type="checkbox"
            :disabled="!hasPipeline"
          />
          Buat deal
        </label>
        <p v-if="!hasPipeline" class="text-xs text-gray-500">
          Belum ada pipeline aktif. Buat pipeline dulu di menu Pipelines untuk membuat deal.
        </p>
        <p
          v-else-if="form.createDeal && !lead?.requirement_summary && !lead?.budget_estimate"
          class="text-xs text-gray-500"
        >
          Kebutuhan belum diisi, deal dibuat tanpa nilai.
        </p>
        <DealFormFields
          v-if="form.createDeal"
          v-model="form.deal"
          :pipelines="pipelines"
          :members="members"
        />
      </section>

      <p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>
      <div class="flex justify-end gap-2">
        <BaseButton type="button" variant="secondary" @click="emit('close')">Batal</BaseButton>
        <BaseButton type="submit" :disabled="mutation.isPending.value">
          {{ form.createDeal ? 'Convert dan buka deal' : 'Convert' }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
