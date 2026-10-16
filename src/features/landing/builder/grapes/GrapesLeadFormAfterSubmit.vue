<script setup lang="ts">
import { reactive, ref, watch } from 'vue'

import { safeHref } from '../../renderer/grapes/chrome'
import { normalizeWhatsAppNumber } from '../../renderer/lead-form/whatsapp-link'
import type { AfterSubmitAction, LandingFormWithFields } from '../../shared/types/landing.types'

/**
 * Bagian "Setelah kirim" panel Form Konsultasi: pesan sukses, redirect, atau lanjut ke WhatsApp,
 * plus judul tombol. Nilai tidak valid tetap terlihat di input (draf) dan tidak dikirim; aksi
 * redirect/whatsapp baru dikirim setelah input wajibnya valid, supaya server tidak menolaknya.
 */
const SUBMIT_LABEL_MAX = 100
const WA_MESSAGE_MAX = 500

const props = defineProps<{ form: LandingFormWithFields }>()
const emit = defineEmits<{ (e: 'patch', body: Record<string, unknown>): void }>()

const ACTIONS: { id: AfterSubmitAction; label: string }[] = [
  { id: 'message', label: 'Pesan sukses' },
  { id: 'redirect', label: 'Redirect ke URL' },
  { id: 'whatsapp', label: 'Lanjut ke WhatsApp' },
]

const action = ref<AfterSubmitAction>(props.form.after_submit)
const draft = reactive({
  submitLabel: '',
  successMessage: '',
  redirectUrl: '',
  whatsappNumber: '',
  whatsappMessage: '',
})
const errors = reactive<Record<string, string>>({})

watch(
  () => props.form.id,
  () => {
    action.value = props.form.after_submit
    draft.submitLabel = props.form.submit_label
    draft.successMessage = props.form.success_message
    draft.redirectUrl = props.form.redirect_url ?? ''
    draft.whatsappNumber = props.form.whatsapp_number ?? ''
    draft.whatsappMessage = props.form.whatsapp_message ?? ''
    for (const k of Object.keys(errors)) errors[k] = ''
  },
  { immediate: true },
)

/** Kosong = valid-tapi-kosong; null = tidak valid; selain itu nilai yang akan dikirim. */
function validRedirect(value: string): string | null {
  if (!value) return ''
  if (safeHref(value) !== value || !/^(\/(?!\/)|https?:\/\/)/i.test(value)) return null
  return value
}

function onAction(next: AfterSubmitAction) {
  action.value = next
  errors.redirect = ''
  errors.whatsappNumber = ''
  if (next === 'message') {
    emit('patch', { after_submit: 'message' })
    return
  }
  if (next === 'redirect') {
    const url = validRedirect(draft.redirectUrl.trim())
    if (url) emit('patch', { after_submit: 'redirect', redirect_url: url })
    return
  }
  const number = normalizeWhatsAppNumber(draft.whatsappNumber)
  if (number) emit('patch', { after_submit: 'whatsapp', whatsapp_number: number })
}

function onSubmitLabel(e: Event) {
  draft.submitLabel = (e.target as HTMLInputElement).value
  const value = draft.submitLabel.trim()
  if (!value) {
    errors.submitLabel = 'Judul tombol wajib diisi.'
    return
  }
  if (value.length > SUBMIT_LABEL_MAX) {
    errors.submitLabel = `Judul tombol maksimal ${SUBMIT_LABEL_MAX} karakter.`
    return
  }
  errors.submitLabel = ''
  emit('patch', { submit_label: value })
}

function onSuccessMessage(e: Event) {
  draft.successMessage = (e.target as HTMLTextAreaElement).value
  emit('patch', { success_message: draft.successMessage.trim() })
}

function onRedirect(e: Event) {
  draft.redirectUrl = (e.target as HTMLInputElement).value
  const url = validRedirect(draft.redirectUrl.trim())
  if (url === null) {
    errors.redirect = 'URL tidak valid. Gunakan /path atau https://…'
    return
  }
  if (url === '' && action.value === 'redirect') {
    errors.redirect = 'URL redirect wajib diisi.'
    return
  }
  errors.redirect = ''
  emit(
    'patch',
    action.value === 'redirect'
      ? { redirect_url: url, after_submit: 'redirect' }
      : { redirect_url: url },
  )
}

function onWhatsappNumber(e: Event) {
  draft.whatsappNumber = (e.target as HTMLInputElement).value
  const number = normalizeWhatsAppNumber(draft.whatsappNumber)
  if (number === null) {
    errors.whatsappNumber = 'Nomor WhatsApp tidak valid.'
    return
  }
  if (number === '' && action.value === 'whatsapp') {
    errors.whatsappNumber = 'Nomor WhatsApp wajib diisi.'
    return
  }
  errors.whatsappNumber = ''
  emit(
    'patch',
    action.value === 'whatsapp'
      ? { whatsapp_number: number, after_submit: 'whatsapp' }
      : { whatsapp_number: number },
  )
}

function onWhatsappMessage(e: Event) {
  draft.whatsappMessage = (e.target as HTMLTextAreaElement).value
  const value = draft.whatsappMessage.trim()
  if (value.length > WA_MESSAGE_MAX) {
    errors.whatsappMessage = `Template pesan maksimal ${WA_MESSAGE_MAX} karakter.`
    return
  }
  errors.whatsappMessage = ''
  emit('patch', { whatsapp_message: value })
}
</script>

<template>
  <div class="as">
    <fieldset class="as-actions">
      <legend class="as-legend">Setelah kirim</legend>
      <label v-for="a in ACTIONS" :key="a.id" class="as-radio">
        <input
          type="radio"
          :name="`after-submit-${form.id}`"
          :value="a.id"
          :checked="action === a.id"
          @change="onAction(a.id)"
        />
        {{ a.label }}
      </label>
    </fieldset>

    <label class="as-label">
      Judul tombol
      <input
        class="as-input"
        type="text"
        aria-label="Judul tombol"
        :value="draft.submitLabel"
        @change="onSubmitLabel"
      />
    </label>
    <p v-if="errors.submitLabel" class="as-error" role="alert">{{ errors.submitLabel }}</p>

    <label v-if="action !== 'redirect'" class="as-label">
      Pesan sukses
      <textarea
        class="as-input as-textarea"
        rows="3"
        aria-label="Pesan sukses"
        :value="draft.successMessage"
        @change="onSuccessMessage"
      ></textarea>
    </label>

    <template v-if="action === 'redirect'">
      <label class="as-label">
        URL redirect
        <input
          class="as-input"
          type="text"
          aria-label="URL redirect"
          placeholder="/terima-kasih atau https://…"
          :value="draft.redirectUrl"
          @change="onRedirect"
        />
      </label>
      <p v-if="errors.redirect" class="as-error" role="alert">{{ errors.redirect }}</p>
    </template>

    <template v-if="action === 'whatsapp'">
      <label class="as-label">
        Nomor WhatsApp
        <input
          class="as-input"
          type="text"
          inputmode="tel"
          aria-label="Nomor WhatsApp"
          placeholder="0812xxxxxxx"
          :value="draft.whatsappNumber"
          @change="onWhatsappNumber"
        />
      </label>
      <p v-if="errors.whatsappNumber" class="as-error" role="alert">{{ errors.whatsappNumber }}</p>
      <label class="as-label">
        Template pesan
        <textarea
          class="as-input as-textarea"
          rows="3"
          aria-label="Template pesan WhatsApp"
          placeholder="Halo, saya {nama}. Saya tertarik dengan {minat}."
          :value="draft.whatsappMessage"
          @change="onWhatsappMessage"
        ></textarea>
        <span class="as-hint">
          {nama} dan {minat} diisi dari form. Kosong = template standar.
        </span>
      </label>
      <p v-if="errors.whatsappMessage" class="as-error" role="alert">
        {{ errors.whatsappMessage }}
      </p>
    </template>
  </div>
</template>

<style scoped>
.as {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 2px 2px 12px;
}
.as-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  border: 0;
}
.as-legend {
  padding: 0;
  margin-bottom: 4px;
  font-size: 11px;
  color: #64748b;
}
.as-radio {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #475569;
}
.as-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: #64748b;
}
.as-input {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 7px 9px;
  font-size: 12px;
  color: #0f172a;
  background: #ffffff;
  font-family: inherit;
}
.as-input:focus {
  outline: none;
  border-color: #0369a1;
  box-shadow: 0 0 0 3px rgba(3, 105, 161, 0.12);
}
.as-textarea {
  resize: vertical;
}
.as-hint {
  font-size: 10px;
  color: #94a3b8;
}
.as-error {
  margin: 0;
  font-size: 11px;
  color: #dc2626;
}
</style>
