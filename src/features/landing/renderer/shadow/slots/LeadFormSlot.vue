<script setup lang="ts">
import { computed, nextTick, reactive, ref, useId, watch } from 'vue'
import { useRouter } from 'vue-router'

import { landingApi, SubmitFormError } from '../../../shared/api/landing.api'
import type { GrapesChrome, GrapesChromeFormField } from '../../grapes/chrome'
import { CONSENT_ERROR, validateLeadForm } from '../../lead-form/lead-form-validation'
import { useLandingPageContext } from '../page-context'

const props = defineProps<{
  host: HTMLElement
  chrome: GrapesChrome
  dataset: Record<string, string>
}>()

const GENERIC_ERROR = 'Pesan belum terkirim. Coba lagi sebentar lagi.'
const RATE_LIMITED_ERROR = 'Terlalu banyak percobaan, coba lagi sebentar lagi.'
const HALF_WIDTH_KEYS = new Set(['name', 'email', 'phone', 'company', 'company_size'])
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const

const ctx = useLandingPageContext()
const router = useRouter()
const uid = useId()

const formId = computed(() => {
  try {
    const parsed = JSON.parse(props.dataset.zyadConfig || '{}') as { form_id?: unknown }
    return typeof parsed.form_id === 'string' ? parsed.form_id : ''
  } catch {
    return ''
  }
})
const form = computed(() => props.chrome.forms?.find((f) => f.id === formId.value))
const fields = computed(() => (form.value?.fields ?? []).filter((f) => f.type !== 'hidden'))
const hasConsentField = computed(() =>
  fields.value.some((f) => f.key === 'consent' && f.type === 'checkbox'),
)
// The backend always requires consent=true, so forms without a consent field get a built-in one.
const needsBuiltinConsent = computed(() => !hasConsentField.value)

const values = reactive<Record<string, unknown>>({})
const website = ref('')
const errors = ref<Record<string, string>>({})
const submitting = ref(false)
const submitted = ref(false)
const submitError = ref('')
const root = ref<HTMLElement | null>(null)

// One key per attempt: reused when the same payload is retried (the server then returns the
// stored submission instead of creating a second one), reset once the input changes or on success.
let attemptKey: string | null = null
watch(values, () => {
  attemptKey = null
})

watch(
  () => [ctx.interest.value, fields.value] as const,
  ([interest]) => {
    if (interest && fields.value.some((f) => f.key === 'interest')) values.interest = interest
  },
  { immediate: true },
)

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

function validate(): Record<string, string> {
  const result = validateLeadForm(fields.value, values)
  if (needsBuiltinConsent.value && values.consent !== true) result.consent = CONSENT_ERROR
  return result
}

function buildFields(): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of fields.value) {
    const value = values[f.key]
    if (f.type === 'checkbox') {
      out[f.key] = value === true
    } else if (value !== undefined && value !== null && String(value).trim() !== '') {
      out[f.key] = String(value).trim()
    }
  }
  if (needsBuiltinConsent.value) out.consent = values.consent === true
  out.page_url = window.location.href
  return out
}

function buildContext() {
  const params = new URLSearchParams(window.location.search)
  const context: Record<string, string> = {}
  if (document.referrer) context.referrer = document.referrer
  for (const key of UTM_KEYS) {
    const value = params.get(key)
    if (value) context[key] = value
  }
  return context
}

function redirect(url: string) {
  if (url.startsWith('/') && !url.startsWith('//')) {
    void router.push(url)
  } else {
    window.location.assign(url)
  }
}

async function focusFirstError() {
  await nextTick()
  const order = [...fields.value.map((f) => f.key), 'consent']
  const first = order.find((key) => errors.value[key])
  if (!first) return
  root.value?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
}

async function onSubmit() {
  if (submitting.value || !form.value) return
  submitError.value = ''
  errors.value = validate()
  if (Object.keys(errors.value).length > 0) {
    await focusFirstError()
    return
  }

  submitting.value = true
  attemptKey ??= crypto.randomUUID()
  try {
    await landingApi.submitPublicForm(
      form.value.id,
      {
        fields: buildFields(),
        consent: values.consent === true,
        website: website.value,
        context: buildContext(),
      },
      attemptKey,
    )
    attemptKey = null
    submitted.value = true
    if (form.value.redirectUrl) redirect(form.value.redirectUrl)
  } catch (err) {
    submitError.value =
      err instanceof SubmitFormError && err.status === 429 ? RATE_LIMITED_ERROR : GENERIC_ERROR
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section v-if="form" ref="root" class="zy-slot-lead-form">
    <div
      v-if="submitted"
      class="zy-slot-lead-form__success zy-anim-fade-up is-in"
      role="status"
      aria-live="polite"
    >
      <p>{{ form.successMessage || 'Terima kasih! Pesan Anda sudah kami terima.' }}</p>
    </div>

    <form v-else novalidate :aria-busy="submitting" @submit.prevent="onSubmit">
      <div class="zy-slot-lead-form__grid">
        <template v-for="field in fields" :key="field.key">
          <div
            v-if="field.type === 'checkbox'"
            class="zy-slot-lead-form__field zy-slot-lead-form__field--full"
          >
            <label class="zy-slot-lead-form__consent" :for="inputId(field.key)">
              <input
                :id="inputId(field.key)"
                v-model="values[field.key]"
                type="checkbox"
                :name="field.key"
                :aria-invalid="errors[field.key] ? 'true' : undefined"
                :aria-describedby="errors[field.key] ? errorId(field.key) : undefined"
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
            :class="{ 'zy-slot-lead-form__field--full': !HALF_WIDTH_KEYS.has(field.key) }"
          >
            <label class="zy-slot-lead-form__label" :for="inputId(field.key)">
              {{ field.label }}<span v-if="field.required" class="zy-slot-lead-form__req">*</span>
            </label>
            <textarea
              v-if="field.type === 'textarea'"
              :id="inputId(field.key)"
              :value="String(values[field.key] ?? '')"
              class="zy-slot-lead-form__input"
              :name="field.key"
              rows="4"
              :placeholder="field.placeholder || undefined"
              :aria-invalid="errors[field.key] ? 'true' : undefined"
              :aria-describedby="errors[field.key] ? errorId(field.key) : undefined"
              @input="values[field.key] = ($event.target as HTMLTextAreaElement).value"
            ></textarea>
            <select
              v-else-if="field.type === 'select'"
              :id="inputId(field.key)"
              v-model="values[field.key]"
              class="zy-slot-lead-form__input"
              :name="field.key"
              :aria-invalid="errors[field.key] ? 'true' : undefined"
              :aria-describedby="errors[field.key] ? errorId(field.key) : undefined"
            >
              <option value="">{{ field.placeholder || 'Pilih salah satu' }}</option>
              <option v-for="option in field.options" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
            <input
              v-else
              :id="inputId(field.key)"
              v-model="values[field.key]"
              class="zy-slot-lead-form__input"
              :type="inputType(field.type)"
              :inputmode="inputMode(field.type)"
              :autocomplete="autocompleteFor(field)"
              :name="field.key"
              :placeholder="field.placeholder || undefined"
              :aria-invalid="errors[field.key] ? 'true' : undefined"
              :aria-describedby="errors[field.key] ? errorId(field.key) : undefined"
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
          v-if="needsBuiltinConsent"
          class="zy-slot-lead-form__field zy-slot-lead-form__field--full"
        >
          <label class="zy-slot-lead-form__consent" :for="inputId('consent')">
            <input
              :id="inputId('consent')"
              v-model="values.consent"
              type="checkbox"
              name="consent"
              :aria-invalid="errors.consent ? 'true' : undefined"
              :aria-describedby="errors.consent ? errorId('consent') : undefined"
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
            v-model="website"
            type="text"
            name="website"
            tabindex="-1"
            autocomplete="off"
          />
        </div>

        <div class="zy-slot-lead-form__field zy-slot-lead-form__field--full">
          <p v-if="submitError" class="zy-slot-lead-form__alert" role="alert">
            {{ submitError }}
          </p>
          <button type="submit" class="zy-slot-lead-form__submit" :disabled="submitting">
            {{ submitting ? 'Mengirim…' : form.submitLabel || 'Kirim' }}
          </button>
        </div>
      </div>
    </form>
  </section>
</template>
