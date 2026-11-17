<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'

import { landingApi } from '../../shared/api/landing.api'
import type { FormFieldItem, LandingFormWithFields } from '../../shared/types/landing.types'
import {
  CONFIGURABLE_KEYS,
  fieldStatus,
  moveField,
  presetFields,
  withStatus,
  type ConfigurableKey,
  type LeadFormPreset,
} from './lead-form-presets'

/**
 * Bagian "Field" panel Form Konsultasi: status Tampil/Wajib/Sembunyi per field yang bisa diatur,
 * label/placeholder/opsi/nilai default, urutan, dan preset. Perubahan disimpan otomatis
 * (debounce) lewat replaceFormFields dengan seluruh daftar field.
 */
const SAVE_DEBOUNCE_MS = 600
const CORE_FIELDS_MESSAGE = 'Nama, Email, dan No. WA wajib untuk form yang meneruskan ke CRM.'
const PRESETS: { id: LeadFormPreset; label: string }[] = [
  { id: 'ringkas', label: 'Ringkas' },
  { id: 'standar', label: 'Standar' },
  { id: 'lengkap', label: 'Lengkap' },
]
const STATUSES = [
  { id: 'show', label: 'Tampil' },
  { id: 'required', label: 'Wajib' },
  { id: 'hidden', label: 'Sembunyi' },
] as const

const props = defineProps<{ pageId: string; form: LandingFormWithFields }>()
const emit = defineEmits<{ (e: 'saved', fields: FormFieldItem[]): void }>()

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const sortFields = (list: FormFieldItem[]) =>
  [...list].sort((a, b) => a.sort_order - b.sort_order).map((f) => ({ ...f }))

const fields = ref<FormFieldItem[]>(sortFields(props.form.fields))
let lastSaved: FormFieldItem[] = sortFields(props.form.fields)
const saveState = ref<SaveState>('idle')
const errorMessage = ref('')
const expandedKey = ref('')
const pendingPreset = ref<LeadFormPreset | ''>('')
const labelErrors = reactive<Record<string, string>>({})
// Teks mentah textarea opsi: menyimpan baris kosong yang sedang diketik.
const optionsDraft = reactive<Record<string, string>>({})

let timer: ReturnType<typeof setTimeout> | null = null
let saveSeq = 0

// Panel induk memperbarui `form` setelah setiap simpan; salinan kerja hanya di-reset saat ganti form.
watch(
  () => props.form.id,
  () => {
    cancelTimer()
    fields.value = sortFields(props.form.fields)
    lastSaved = sortFields(props.form.fields)
    saveState.value = 'idle'
    errorMessage.value = ''
    expandedKey.value = ''
    pendingPreset.value = ''
  },
)

function withoutId(f: FormFieldItem): FormFieldItem {
  const copy = { ...f }
  delete copy.id
  return copy
}

const configurable = (key: string) => (CONFIGURABLE_KEYS as readonly string[]).includes(key)

function effectiveType(f: FormFieldItem): string {
  if (f.type !== 'hidden') return f.type
  const t = f.validation?.original_type
  return typeof t === 'string' ? t : 'text'
}

function cancelTimer() {
  if (timer) clearTimeout(timer)
  timer = null
}

function schedule() {
  errorMessage.value = ''
  if (Object.values(labelErrors).some(Boolean)) return
  cancelTimer()
  timer = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS)
}

function toPayload(list: FormFieldItem[]): FormFieldItem[] {
  return list.map((f) => ({ ...withoutId(f), default_value: f.default_value ?? '' }))
}

async function flush() {
  cancelTimer()
  const seq = ++saveSeq
  const sent = fields.value.map((f) => ({ ...f }))
  saveState.value = 'saving'
  try {
    const res = await landingApi.replaceFormFields(props.pageId, props.form.id, {
      fields: toPayload(sent),
    })
    if (seq !== saveSeq) return // respons lama; simpan yang lebih baru sudah berjalan
    lastSaved = sent
    saveState.value = 'saved'
    emit('saved', res.data)
  } catch (error) {
    if (seq !== saveSeq) return
    const response = (
      error as { response?: { status?: number; data?: { code?: string; message?: string } } }
    ).response
    if (response?.status === 422) {
      // Server menolak: kembali ke status tersimpan terakhir.
      fields.value = lastSaved.map((f) => ({ ...f }))
      for (const k of Object.keys(optionsDraft)) delete optionsDraft[k]
      saveState.value = 'idle'
      errorMessage.value =
        response.data?.code === 'LANDING_FORM_CORE_FIELDS'
          ? CORE_FIELDS_MESSAGE
          : (response.data?.message ?? 'Perubahan field ditolak server.')
      return
    }
    console.error('GrapesLeadFormFields: failed to save fields', error)
    saveState.value = 'error'
  }
}

function retry() {
  void flush()
}

onBeforeUnmount(() => {
  // Perubahan yang belum sempat disimpan tetap dikirim.
  if (timer) void flush()
})

function update(key: string, patch: Partial<FormFieldItem>) {
  fields.value = fields.value.map((f) => (f.key === key ? { ...f, ...patch } : f))
  schedule()
}

function setStatus(key: string, status: 'show' | 'required' | 'hidden') {
  fields.value = fields.value.map((f) => (f.key === key ? withStatus(f, status) : f))
  schedule()
}

function onLabel(f: FormFieldItem, value: string) {
  if (!value.trim()) {
    labelErrors[f.key] = 'Label wajib diisi.'
    return
  }
  labelErrors[f.key] = ''
  update(f.key, { label: value })
}

function optionsText(f: FormFieldItem): string {
  return optionsDraft[f.key] ?? (f.options ?? []).join('\n')
}

function onOptions(f: FormFieldItem, value: string) {
  optionsDraft[f.key] = value
  const options = value
    .split('\n')
    .map((o) => o.trim())
    .filter(Boolean)
  const defaultValue = f.default_value && options.includes(f.default_value) ? f.default_value : ''
  update(f.key, { options, default_value: defaultValue })
}

function move(key: string, dir: -1 | 1) {
  fields.value = moveField(fields.value, key, dir)
  schedule()
}

function askPreset(preset: LeadFormPreset) {
  pendingPreset.value = preset
}

function applyPreset() {
  if (!pendingPreset.value) return
  fields.value = presetFields(pendingPreset.value, fields.value)
  pendingPreset.value = ''
  schedule()
}

function toggle(key: string) {
  expandedKey.value = expandedKey.value === key ? '' : key
}

const rows = computed(() =>
  fields.value.map((f) => ({
    field: f,
    status: fieldStatus(f),
    type: effectiveType(f),
    editable: f.key !== 'consent',
    canConfigure: configurable(f.key as ConfigurableKey),
  })),
)

const stateText = computed(() => {
  switch (saveState.value) {
    case 'saving':
      return 'Menyimpan…'
    case 'saved':
      return 'Tersimpan'
    case 'error':
      return 'Gagal menyimpan · Coba lagi'
    default:
      return ''
  }
})
</script>

<template>
  <div class="gf">
    <div class="gf-presets" role="group" aria-label="Terapkan preset">
      <button
        v-for="p in PRESETS"
        :key="p.id"
        type="button"
        class="gf-chip"
        :data-preset="p.id"
        @click="askPreset(p.id)"
      >
        {{ p.label }}
      </button>
    </div>
    <div v-if="pendingPreset" class="gf-confirm" role="alertdialog" aria-label="Konfirmasi preset">
      <p>Status field akan diganti sesuai preset. Lanjutkan?</p>
      <button
        type="button"
        class="gf-chip gf-chip--on"
        data-action="preset-confirm"
        @click="applyPreset"
      >
        Ya
      </button>
      <button type="button" class="gf-chip" data-action="preset-cancel" @click="pendingPreset = ''">
        Batal
      </button>
    </div>

    <ul class="gf-list">
      <li v-for="(row, i) in rows" :key="row.field.key" class="gf-row" :data-field="row.field.key">
        <div class="gf-head">
          <svg
            v-if="row.status === 'locked'"
            class="gf-lock"
            role="img"
            aria-label="Terkunci"
            viewBox="0 0 16 16"
            width="12"
            height="12"
          >
            <path
              fill="currentColor"
              d="M8 1a3 3 0 0 0-3 3v2H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1V4a3 3 0 0 0-3-3Zm-1.5 3a1.5 1.5 0 0 1 3 0v2h-3V4Z"
            />
          </svg>
          <button
            v-if="row.editable"
            type="button"
            class="gf-name"
            data-action="toggle"
            :aria-expanded="expandedKey === row.field.key"
            @click="toggle(row.field.key)"
          >
            {{ row.field.label }}
          </button>
          <span v-else class="gf-name gf-name--static">{{ row.field.label }}</span>
          <span class="gf-move">
            <button
              type="button"
              data-action="up"
              :aria-label="`Naikkan ${row.field.label}`"
              :disabled="i === 0 || row.field.key === 'consent'"
              @click="move(row.field.key, -1)"
            >
              ↑
            </button>
            <button
              type="button"
              data-action="down"
              :aria-label="`Turunkan ${row.field.label}`"
              :disabled="row.field.key === 'consent' || rows[i + 1]?.field.key === 'consent'"
              @click="move(row.field.key, 1)"
            >
              ↓
            </button>
          </span>
        </div>

        <div
          v-if="row.canConfigure"
          class="gf-status"
          role="radiogroup"
          :aria-label="`Status ${row.field.label}`"
        >
          <button
            v-for="s in STATUSES"
            :key="s.id"
            type="button"
            role="radio"
            class="gf-seg"
            :aria-checked="row.status === s.id"
            :class="{ 'gf-seg--on': row.status === s.id }"
            @click="setStatus(row.field.key, s.id)"
          >
            {{ s.label }}
          </button>
        </div>

        <div v-if="row.editable && expandedKey === row.field.key" class="gf-detail">
          <label class="gf-label">
            Label
            <input
              class="gf-input"
              type="text"
              aria-label="Label"
              :value="row.field.label"
              @input="onLabel(row.field, ($event.target as HTMLInputElement).value)"
            />
          </label>
          <p v-if="labelErrors[row.field.key]" class="gf-error" role="alert">
            {{ labelErrors[row.field.key] }}
          </p>
          <label class="gf-label">
            Placeholder
            <input
              class="gf-input"
              type="text"
              aria-label="Placeholder"
              :value="row.field.placeholder ?? ''"
              @input="
                update(row.field.key, { placeholder: ($event.target as HTMLInputElement).value })
              "
            />
          </label>
          <label v-if="row.type === 'select'" class="gf-label">
            Opsi (satu per baris)
            <textarea
              class="gf-input"
              rows="4"
              aria-label="Opsi"
              :value="optionsText(row.field)"
              @input="onOptions(row.field, ($event.target as HTMLTextAreaElement).value)"
            ></textarea>
          </label>
          <label v-if="row.status === 'hidden'" class="gf-label">
            Nilai default
            <select
              v-if="row.type === 'select'"
              class="gf-input"
              aria-label="Nilai default"
              :value="row.field.default_value ?? ''"
              @change="
                update(row.field.key, { default_value: ($event.target as HTMLSelectElement).value })
              "
            >
              <option value="">(kosong)</option>
              <option v-for="o in row.field.options ?? []" :key="o" :value="o">{{ o }}</option>
            </select>
            <input
              v-else
              class="gf-input"
              type="text"
              aria-label="Nilai default"
              maxlength="500"
              :value="row.field.default_value ?? ''"
              @input="
                update(row.field.key, { default_value: ($event.target as HTMLInputElement).value })
              "
            />
            <span class="gf-hint">Dikirim otomatis ke CRM bila pengunjung tidak mengisinya.</span>
          </label>
        </div>
      </li>
    </ul>

    <p v-if="errorMessage" class="gf-error" role="alert">{{ errorMessage }}</p>
    <p class="gf-state" aria-live="polite">
      {{ stateText }}
      <button
        v-if="saveState === 'error'"
        type="button"
        class="gf-link"
        data-action="retry"
        @click="retry"
      >
        Coba lagi
      </button>
    </p>
  </div>
</template>

<style scoped>
.gf {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 2px 2px 12px;
}
.gf-presets {
  display: flex;
  gap: 6px;
}
.gf-chip {
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 11px;
  color: #475569;
  background: #ffffff;
  cursor: pointer;
}
.gf-chip--on {
  border-color: #0369a1;
  color: #0369a1;
}
.gf-confirm {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border-radius: 8px;
  background: #f8fafc;
  font-size: 11px;
}
.gf-confirm p {
  flex-basis: 100%;
  margin: 0;
}
.gf-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.gf-row {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 6px 8px;
}
.gf-head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.gf-lock {
  color: #94a3b8;
}
.gf-name {
  flex: 1;
  min-width: 0;
  border: 0;
  padding: 2px 0;
  background: none;
  font: inherit;
  font-weight: 600;
  text-align: left;
  color: #0f172a;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gf-name--static {
  cursor: default;
}
.gf-move button {
  border: 0;
  padding: 2px 5px;
  background: none;
  color: #64748b;
  cursor: pointer;
}
.gf-move button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.gf-status {
  display: flex;
  margin-top: 6px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}
.gf-seg {
  flex: 1;
  border: 0;
  border-right: 1px solid #e2e8f0;
  padding: 4px 0;
  font-size: 11px;
  color: #64748b;
  background: #ffffff;
  cursor: pointer;
}
.gf-seg:last-child {
  border-right: 0;
}
.gf-seg--on {
  background: #e0f2fe;
  color: #0369a1;
  font-weight: 600;
}
.gf-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}
.gf-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: #64748b;
}
.gf-input {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 6px 8px;
  font: inherit;
  font-size: 12px;
  color: #0f172a;
  background: #ffffff;
}
.gf-input:focus {
  outline: none;
  border-color: #0369a1;
  box-shadow: 0 0 0 3px rgba(3, 105, 161, 0.12);
}
.gf-hint {
  font-size: 10px;
  color: #94a3b8;
}
.gf-error {
  margin: 0;
  font-size: 11px;
  color: #dc2626;
}
.gf-state {
  min-height: 16px;
  margin: 0;
  font-size: 11px;
  color: #64748b;
}
.gf-link {
  border: 0;
  padding: 0;
  background: none;
  font: inherit;
  color: #0369a1;
  text-decoration: underline;
  cursor: pointer;
}
</style>
