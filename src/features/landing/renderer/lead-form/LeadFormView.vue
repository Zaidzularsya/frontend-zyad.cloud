<script setup lang="ts">
import { computed, ref, useId } from 'vue'

import type { GrapesChromeForm, GrapesChromeFormField } from '../grapes/chrome'
import {
  presentationStyle,
  supportsColumns,
  type LeadFormPresentation,
} from './lead-form-presentation'

/**
 * Tampilan murni Form Konsultasi (semua gaya). Dipakai slot publik (dengan logika submit) dan
 * kanvas editor (disabled), supaya pratinjau identik dengan halaman publik. Tidak punya state
 * form sendiri: nilai, error, dan status datang lewat props; perubahan dikirim lewat emit.
 */
const props = defineProps<{
  form: GrapesChromeForm
  presentation: LeadFormPresentation
  values: Record<string, unknown>
  errors: Record<string, string>
  state: 'idle' | 'submitting' | 'success'
  submitError: string
  /** '' = tanpa tombol WhatsApp (URL dihitung slot). */
  successHref: string
  /** Kanvas/preview: semua kontrol nonaktif. */
  disabled: boolean
  /** Teks kecil di bawah tombol; '' = tidak ada. */
  hint: string
}>()

const emit = defineEmits<{
  (e: 'update', key: string, value: unknown): void
  (e: 'submit'): void
}>()

const HALF_WIDTH_KEYS = new Set(['name', 'email', 'phone', 'company', 'company_size'])

const uid = useId()
const root = ref<HTMLElement | null>(null)

const style = computed(() => props.presentation.style)
const fields = computed(() => props.form.fields.filter((f) => f.type !== 'hidden'))
const hasConsentField = computed(() =>
  fields.value.some((f) => f.key === 'consent' && f.type === 'checkbox'),
)
const rootClasses = computed(() => [
  'zy-slot-lead-form',
  `zy-slot-lead-form--${style.value}`,
  { 'zy-slot-lead-form--cols-1': props.presentation.columns === 1 && supportsColumns(style.value) },
])
const rootStyle = computed(() => presentationStyle(props.presentation))
const showAside = computed(
  () =>
    style.value === 'split' &&
    (props.presentation.split.title !== '' || props.presentation.split.points.length > 0),
)
const isGlass = computed(() => style.value === 'glass')

function inputId(key: string): string {
  return `${uid}-${key}`
}
function errorId(key: string): string {
  return `${uid}-${key}-error`
}
function inputType(type: string): string {
  switch (type) {
    case 'phone':
      return 'tel'
    case 'email':
    case 'number':
    case 'date':
      return type
    default:
      return 'text'
  }
}
function inputMode(type: string): 'tel' | undefined {
  return type === 'phone' ? 'tel' : undefined
}
function autocompleteFor(field: GrapesChromeFormField): string | undefined {
  const map: Record<string, string> = {
    name: 'name',
    email: 'email',
    phone: 'tel',
    company: 'organization',
  }
  return map[field.key]
}
// Di gaya Ringkas satu baris, kontrol tinggi (textarea/select) dan consent mengambil satu baris penuh.
function isFull(field: GrapesChromeFormField): boolean {
  if (field.type === 'checkbox') return true
  if (style.value === 'inline') return field.type === 'textarea' || field.type === 'select'
  return !HALF_WIDTH_KEYS.has(field.key)
}
// Glass memakai placeholder sebagai label visual (label asli tetap ada untuk pembaca layar).
function placeholderFor(field: GrapesChromeFormField): string | undefined {
  if (isGlass.value) return `${field.placeholder || field.label}${field.required ? ' *' : ''}`
  return field.placeholder || undefined
}

function ariaFor(key: string) {
  return {
    'aria-invalid': props.errors[key] ? ('true' as const) : undefined,
    'aria-describedby': props.errors[key] ? errorId(key) : undefined,
  }
}

function focusField(key: string) {
  root.value?.querySelector<HTMLElement>(`[name="${key}"]`)?.focus()
}
defineExpose({ focusField })
</script>

<template>
  <section ref="root" :class="rootClasses" :style="rootStyle">
    <div class="zy-slot-lead-form__split">
      <aside v-if="showAside" class="zy-slot-lead-form__aside">
        <h3 v-if="presentation.split.title" class="zy-slot-lead-form__aside-title">
          {{ presentation.split.title }}
        </h3>
        <ul v-if="presentation.split.points.length" class="zy-slot-lead-form__points">
          <li v-for="point in presentation.split.points" :key="point">
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m4 10.5 4 4 8-9"
              />
            </svg>
            <span>{{ point }}</span>
          </li>
        </ul>
      </aside>

      <div class="zy-slot-lead-form__panel">
        <div
          v-if="state === 'success'"
          class="zy-slot-lead-form__success zy-anim-fade-up is-in"
          role="status"
          aria-live="polite"
        >
          <p>{{ form.successMessage || 'Terima kasih! Pesan Anda sudah kami terima.' }}</p>
          <a
            v-if="successHref"
            class="zy-slot-lead-form__wa"
            :href="successHref"
            target="_blank"
            rel="noopener noreferrer"
            >Lanjut chat di WhatsApp</a
          >
        </div>

        <form
          v-else
          novalidate
          :aria-busy="state === 'submitting'"
          @submit.prevent="emit('submit')"
        >
          <div class="zy-slot-lead-form__grid">
            <template v-for="field in fields" :key="field.key">
              <div
                v-if="field.type === 'checkbox'"
                class="zy-slot-lead-form__field zy-slot-lead-form__field--full"
              >
                <label class="zy-slot-lead-form__consent" :for="inputId(field.key)">
                  <input
                    :id="inputId(field.key)"
                    type="checkbox"
                    :name="field.key"
                    :checked="values[field.key] === true"
                    :disabled="disabled"
                    v-bind="ariaFor(field.key)"
                    @change="emit('update', field.key, ($event.target as HTMLInputElement).checked)"
                  />
                  <span>
                    {{ field.label }}
                    <template v-if="field.key === 'consent'">
                      (<a href="/legal/privacy" target="_blank" rel="noopener noreferrer"
                        >Kebijakan Privasi</a
                      >)
                    </template>
                  </span>
                </label>
                <p
                  v-if="errors[field.key]"
                  :id="errorId(field.key)"
                  class="zy-slot-lead-form__error"
                  role="alert"
                >
                  {{ errors[field.key] }}
                </p>
              </div>

              <div
                v-else
                class="zy-slot-lead-form__field"
                :class="{ 'zy-slot-lead-form__field--full': isFull(field) }"
              >
                <label class="zy-slot-lead-form__label" :for="inputId(field.key)">
                  {{ field.label
                  }}<span v-if="field.required" class="zy-slot-lead-form__req">*</span>
                </label>
                <textarea
                  v-if="field.type === 'textarea'"
                  :id="inputId(field.key)"
                  :value="String(values[field.key] ?? '')"
                  class="zy-slot-lead-form__input"
                  :name="field.key"
                  rows="4"
                  :disabled="disabled"
                  :placeholder="placeholderFor(field)"
                  v-bind="ariaFor(field.key)"
                  @input="emit('update', field.key, ($event.target as HTMLTextAreaElement).value)"
                ></textarea>
                <select
                  v-else-if="field.type === 'select'"
                  :id="inputId(field.key)"
                  :value="String(values[field.key] ?? '')"
                  class="zy-slot-lead-form__input"
                  :name="field.key"
                  :disabled="disabled"
                  v-bind="ariaFor(field.key)"
                  @change="emit('update', field.key, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="">{{ field.placeholder || 'Pilih salah satu' }}</option>
                  <option v-for="option in field.options" :key="option" :value="option">
                    {{ option }}
                  </option>
                </select>
                <input
                  v-else
                  :id="inputId(field.key)"
                  :value="String(values[field.key] ?? '')"
                  class="zy-slot-lead-form__input"
                  :type="inputType(field.type)"
                  :inputmode="inputMode(field.type)"
                  :autocomplete="autocompleteFor(field)"
                  :name="field.key"
                  :disabled="disabled"
                  :placeholder="placeholderFor(field)"
                  v-bind="ariaFor(field.key)"
                  @input="emit('update', field.key, ($event.target as HTMLInputElement).value)"
                />
                <p
                  v-if="errors[field.key]"
                  :id="errorId(field.key)"
                  class="zy-slot-lead-form__error"
                  role="alert"
                >
                  {{ errors[field.key] }}
                </p>
              </div>
            </template>

            <div
              v-if="!hasConsentField"
              class="zy-slot-lead-form__field zy-slot-lead-form__field--full"
            >
              <label class="zy-slot-lead-form__consent" :for="inputId('consent')">
                <input
                  :id="inputId('consent')"
                  type="checkbox"
                  name="consent"
                  :checked="values.consent === true"
                  :disabled="disabled"
                  v-bind="ariaFor('consent')"
                  @change="emit('update', 'consent', ($event.target as HTMLInputElement).checked)"
                />
                <span>
                  Saya setuju data saya diproses untuk keperluan konsultasi sesuai
                  <a href="/legal/privacy" target="_blank" rel="noopener noreferrer"
                    >Kebijakan Privasi</a
                  >
                </span>
              </label>
              <p
                v-if="errors.consent"
                :id="errorId('consent')"
                class="zy-slot-lead-form__error"
                role="alert"
              >
                {{ errors.consent }}
              </p>
            </div>

            <div class="zy-slot-lead-form__hp" aria-hidden="true">
              <label :for="inputId('website')">Website</label>
              <input
                :id="inputId('website')"
                :value="String(values.website ?? '')"
                type="text"
                name="website"
                tabindex="-1"
                autocomplete="off"
                @input="emit('update', 'website', ($event.target as HTMLInputElement).value)"
              />
            </div>

            <div v-if="submitError" class="zy-slot-lead-form__field zy-slot-lead-form__field--full">
              <p class="zy-slot-lead-form__alert" role="alert">{{ submitError }}</p>
            </div>

            <div class="zy-slot-lead-form__actions">
              <button
                type="submit"
                class="zy-slot-lead-form__submit"
                :disabled="state === 'submitting' || disabled"
              >
                {{ state === 'submitting' ? 'Mengirim…' : form.submitLabel || 'Kirim' }}
              </button>
              <p v-if="hint" class="zy-slot-lead-form__hint">{{ hint }}</p>
            </div>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>
