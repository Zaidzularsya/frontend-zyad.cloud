<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { leadsApi, type CrmMember } from '@/features/crm/leads/api/leads.api'
import { useTenantStore } from '@/stores/tenant.store'
import { landingApi } from '../../shared/api/landing.api'
import type { FormFieldItem, LandingFormWithFields } from '../../shared/types/landing.types'
import { parseLeadFormId } from './grapes.lead-form-component'
import GrapesLeadFormAfterSubmit from './GrapesLeadFormAfterSubmit.vue'
import GrapesLeadFormFields from './GrapesLeadFormFields.vue'
import { LEAD_FORM_BASE, nextFormKey, presetFields, type LeadFormPreset } from './lead-form-presets'

/**
 * Panel pengaturan blok "Form Konsultasi": ① pilih/buat form halaman (preset Ringkas/Standar/Lengkap),
 * ② field (GrapesLeadFormFields, autosave), ④ setelah kirim (GrapesLeadFormAfterSubmit), dan
 * ⑤ penerusan ke CRM (toggle + PIC). Pilihan form ditulis ke `data-zyad-config`; pengaturan form
 * lewat updateForm.
 */
const NO_FEATURE_TEXT = 'Butuh fitur Lead Form CRM di paket Anda'

const props = defineProps<{
  component: {
    getAttributes: () => Record<string, string>
    addAttributes: (attrs: Record<string, string>) => void
  }
  pageId: string
}>()
const emit = defineEmits<{ (e: 'forms-change', forms: LandingFormWithFields[]): void }>()

const tenantStore = useTenantStore()

const forms = ref<LandingFormWithFields[]>([])
const selectedId = ref(parseLeadFormId(props.component.getAttributes()['data-zyad-config']))
const members = ref<CrmMember[]>([])
const membersFailed = ref(false)
const loading = ref(true)
const busy = ref(false)
const message = ref('')
const newFormPreset = ref<LeadFormPreset>('ringkas')

const selected = computed(() => forms.value.find((f) => f.id === selectedId.value) ?? null)
// Org platform tidak digerbang fitur (spec): toggle tetap aktif walau members() gagal.
const crmUnavailable = computed(() => membersFailed.value && !tenantStore.isPlatformOrganization)

function withFields(form: { fields?: LandingFormWithFields['fields'] } & object) {
  return { ...form, fields: form.fields ?? [] } as LandingFormWithFields
}

function setForms(next: LandingFormWithFields[]) {
  forms.value = next
  emit('forms-change', next)
}

function replaceForm(updated: LandingFormWithFields) {
  setForms(forms.value.map((f) => (f.id === updated.id ? updated : f)))
}

function selectForm(id: string) {
  selectedId.value = id
  props.component.addAttributes({ 'data-zyad-config': JSON.stringify({ form_id: id }) })
}

onMounted(async () => {
  const [formsResult, membersResult] = await Promise.allSettled([
    landingApi.getForms(props.pageId),
    leadsApi.members(),
  ])
  if (formsResult.status === 'fulfilled') {
    setForms(formsResult.value.data.map(withFields))
  } else {
    message.value = 'Gagal memuat daftar form.'
  }
  if (membersResult.status === 'fulfilled') members.value = membersResult.value
  else membersFailed.value = true
  loading.value = false
})

function onSelect(e: Event) {
  const id = (e.target as HTMLSelectElement).value
  if (id) selectForm(id)
}

async function createWithPreset() {
  busy.value = true
  message.value = ''
  let createdId = ''
  try {
    const key = nextFormKey(forms.value.map((f) => f.key))
    const created = await landingApi.createForm(props.pageId, { ...LEAD_FORM_BASE, key })
    createdId = created.data.id
    const fields = await landingApi.replaceFormFields(props.pageId, createdId, {
      fields: presetFields(newFormPreset.value),
    })
    setForms([...forms.value, withFields({ ...created.data, fields: fields.data })])
    selectForm(createdId)
  } catch (error) {
    console.error('GrapesLeadFormPanel: failed to create form', error)
    message.value = 'Gagal membuat form. Coba lagi.'
    // Jangan tinggalkan form tanpa field.
    if (createdId) await landingApi.deleteForm(props.pageId, createdId).catch(() => undefined)
  } finally {
    busy.value = false
  }
}

async function patch(body: Record<string, unknown>) {
  const form = selected.value
  if (!form) return
  message.value = ''
  try {
    const res = await landingApi.updateForm(props.pageId, form.id, body)
    // Respons PATCH tidak membawa fields — pertahankan yang sudah dimuat.
    replaceForm({ ...res.data, fields: form.fields })
  } catch (error) {
    console.error('GrapesLeadFormPanel: failed to update form', error)
    message.value = 'Gagal menyimpan pengaturan form. Coba lagi.'
  }
}

function onCrmToggle(e: Event) {
  void patch({ create_crm_lead: (e.target as HTMLInputElement).checked })
}

function onOwner(e: Event) {
  void patch({ lead_owner_user_id: (e.target as HTMLSelectElement).value })
}

function onFieldsSaved(fields: FormFieldItem[]) {
  const form = selected.value
  if (form) replaceForm({ ...form, fields })
}
</script>

<template>
  <div class="hp">
    <p class="hp-title">Form Konsultasi</p>
    <p v-if="loading" class="hp-hint">Memuat form…</p>

    <template v-else>
      <div class="hp-body">
        <label class="hp-label">
          Form
          <select class="hp-input" aria-label="Form" :value="selectedId" @change="onSelect">
            <option value="" disabled>Pilih form</option>
            <option v-for="f in forms" :key="f.id" :value="f.id">{{ f.name }} ({{ f.key }})</option>
          </select>
        </label>
        <div class="hp-row">
          <select v-model="newFormPreset" class="hp-input" aria-label="Preset form baru">
            <option value="ringkas">Ringkas</option>
            <option value="standar">Standar</option>
            <option value="lengkap">Lengkap</option>
          </select>
          <button type="button" class="hp-btn" :disabled="busy" @click="createWithPreset">
            Buat form baru
          </button>
        </div>
        <p v-if="message" class="hp-error" role="alert">{{ message }}</p>
      </div>

      <details v-if="selected" class="hp-sec" open>
        <summary>Field</summary>
        <GrapesLeadFormFields
          :key="selected.id"
          :page-id="pageId"
          :form="selected"
          @saved="onFieldsSaved"
        />
      </details>

      <details v-if="selected" class="hp-sec" open>
        <summary>Setelah kirim</summary>
        <GrapesLeadFormAfterSubmit :key="selected.id" :form="selected" @patch="patch" />
      </details>

      <details v-if="selected" class="hp-sec" open>
        <summary>Penerusan ke CRM</summary>
        <div class="hp-body">
          <label class="hp-check">
            <input
              type="checkbox"
              aria-label="Buat lead di CRM"
              :checked="selected.create_crm_lead"
              :disabled="crmUnavailable"
              @change="onCrmToggle"
            />
            Buat lead di CRM
          </label>
          <p v-if="crmUnavailable" class="hp-hint">{{ NO_FEATURE_TEXT }}</p>
          <label class="hp-label">
            PIC lead
            <select
              class="hp-input"
              aria-label="PIC lead"
              :value="selected.lead_owner_user_id ?? ''"
              :disabled="crmUnavailable"
              @change="onOwner"
            >
              <option value="">Pembuat halaman</option>
              <option v-for="m in members" :key="m.user_id" :value="m.user_id">
                {{ m.name }}
              </option>
            </select>
          </label>
        </div>
      </details>
    </template>
  </div>
</template>

<style scoped>
.hp {
  padding: 12px 12px 24px;
  font-size: 12px;
  color: #475569;
}
.hp-title {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #94a3b8;
}
.hp-error {
  margin: 0;
  color: #dc2626;
}
.hp-sec {
  border-top: 1px solid #f1f5f9;
}
.hp-sec > summary {
  padding: 10px 2px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #64748b;
  cursor: pointer;
}
.hp-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 2px 2px 12px;
}
.hp-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: #64748b;
}
.hp-input {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 7px 9px;
  font-size: 12px;
  color: #0f172a;
  background: #ffffff;
  font-family: inherit;
}
.hp-input:disabled {
  background: #f8fafc;
  color: #94a3b8;
}
.hp-textarea {
  resize: vertical;
}
.hp-input:focus {
  outline: none;
  border-color: #0369a1;
  box-shadow: 0 0 0 3px rgba(3, 105, 161, 0.12);
}
.hp-row {
  display: flex;
  gap: 6px;
}
.hp-row .hp-input {
  flex: 1;
  min-width: 0;
}
.hp-btn {
  border: 1px solid #0369a1;
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #0369a1;
  background: #ffffff;
  cursor: pointer;
}
.hp-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.hp-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #475569;
}
.hp-hint {
  margin: 0;
  font-size: 11px;
  color: #94a3b8;
}
</style>
