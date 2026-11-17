<script setup lang="ts">
import {
  isQuotaExceededError,
  quotaExceededGenericMessage,
} from '@/features/entitlements/utils/quota-error'
import { computed, ref, watch } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import DealFormFields from '@/features/crm/components/DealFormFields.vue'
import { useCompanyLookupQuery } from '@/features/crm/companies/api/companies.queries'
import type { Lead, LeadConversionResult } from '@/features/crm/leads/api/leads.api'
import {
  useConvertLeadMutation,
  useCrmMembersQuery,
  useLeadContactMatchesQuery,
} from '@/features/crm/leads/api/leads.queries'
import type { ContactRef } from '@/features/crm/contacts/api/contacts.api'
import { duplicateFromError, toContactRef } from '@/features/crm/contacts/utils/contact-duplicate'
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

// --- Kontak: tawarkan kontak yang email/WA-nya sama agar tidak lahir kontak ganda ---
const matchesQuery = useLeadContactMatchesQuery(computed(() => props.lead?.id ?? ''))
const duplicate = ref<ContactRef | null>(null)
const contactOptions = computed<ContactRef[]>(() => {
  const list = (matchesQuery.data.value ?? []).map(toContactRef)
  if (duplicate.value && !list.some((c) => c.id === duplicate.value?.id)) list.push(duplicate.value)
  return list
})
// Nilai radio: "new" atau "existing:<id>".
const contactChoice = computed({
  get: () =>
    form.value?.contactMode === 'existing' && form.value.contactId
      ? `existing:${form.value.contactId}`
      : 'new',
  set: (value: string) => {
    if (!form.value) return
    if (value.startsWith('existing:')) {
      form.value.contactMode = 'existing'
      form.value.contactId = value.slice('existing:'.length)
    } else {
      form.value.contactMode = 'new'
      form.value.contactId = ''
    }
  },
})
// Kontak yang cocok dipilih default (sekali per lead); pengguna tetap bisa memilih kontak baru.
watch(
  [() => form.value, () => matchesQuery.data.value],
  () => {
    const first = matchesQuery.data.value?.[0]
    if (form.value && first && form.value.contactMode === 'new' && !form.value.contactId)
      contactChoice.value = `existing:${first.id}`
  },
  { immediate: true },
)
watch(
  () => props.lead?.id,
  () => (duplicate.value = null),
)
function useDuplicate() {
  if (duplicate.value) contactChoice.value = `existing:${duplicate.value.id}`
  error.value = ''
}

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
  if (isQuotaExceededError(e)) return quotaExceededGenericMessage()
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
    duplicate.value = duplicateFromError(e)
    error.value = duplicate.value
      ? `Email atau nomor WhatsApp lead ini sudah dipakai kontak ${duplicate.value.name}.`
      : extractError(e)
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
      <section class="space-y-2 rounded-lg border p-3 text-sm">
        <h3 class="font-semibold">Contact</h3>
        <p class="text-gray-600">
          {{ lead?.contact_name }} · {{ lead?.email || '-' }} · {{ lead?.phone || '-' }}
        </p>
        <div v-if="contactOptions.length" class="space-y-1">
          <p class="text-xs text-amber-700 dark:text-amber-300">
            Email/WhatsApp sama dengan kontak yang sudah ada:
          </p>
          <label v-for="c in contactOptions" :key="c.id" class="flex items-center gap-2">
            <input
              v-model="contactChoice"
              type="radio"
              name="contact-mode"
              :value="`existing:${c.id}`"
            />
            <span
              >Pakai {{ c.name }}
              <span class="text-xs text-gray-500">{{
                [c.email, c.phone].filter(Boolean).join(' · ')
              }}</span></span
            >
          </label>
          <label class="flex items-center gap-2">
            <input v-model="contactChoice" type="radio" name="contact-mode" value="new" />
            Buat kontak baru dari lead
          </label>
        </div>
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

      <div v-if="error" class="space-y-1 text-sm text-red-600" role="alert">
        <p>{{ error }}</p>
        <button
          v-if="duplicate"
          type="button"
          class="text-xs font-medium text-brand-600 underline"
          data-testid="use-duplicate-contact"
          @click="useDuplicate"
        >
          Pakai kontak {{ duplicate.name }}
        </button>
      </div>
      <div class="flex justify-end gap-2">
        <BaseButton type="button" variant="secondary" @click="emit('close')">Batal</BaseButton>
        <BaseButton type="submit" :disabled="mutation.isPending.value">
          {{ form.createDeal ? 'Convert dan buka deal' : 'Convert' }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
