<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useToast } from '@/components/ui/toast'
import type { Contact } from '@/features/crm/contacts/api/contacts.api'
import type {
  Quotation,
  QuotationSend,
  SendChannel,
  SendMode,
} from '@/features/crm/quotations/api/quotations.api'
import {
  useQuotationSummaryQuery,
  useSendQuotationViaMutation,
} from '@/features/crm/quotations/api/quotations.queries'
import { quotationErrorCode } from '@/features/crm/quotations/utils/errors'
import {
  buildSendPayload,
  defaultOpening,
  isValidEmail,
  type ChannelState,
} from '@/features/crm/quotations/utils/send-quotation'

const props = defineProps<{
  open: boolean
  quotation: Quotation
  contact: Contact | null
  availability: Record<SendChannel, ChannelState>
  mailboxes?: { id: string; email_address: string }[]
  sessions?: { id: string; display_name?: string }[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'sent', result: { quotation: Quotation; send: QuotationSend }): void
}>()

const toast = useToast()
const sendMutation = useSendQuotationViaMutation()

const channelLabel: Record<SendChannel, string> = { email: 'Email', whatsapp: 'WhatsApp' }
const modes: { value: SendMode; label: string }[] = [
  { value: 'text', label: 'Teks' },
  { value: 'pdf', label: 'PDF' },
  { value: 'text_pdf', label: 'Teks + PDF' },
]

const channel = ref<SendChannel>('email')
const mode = ref<SendMode>('text_pdf')
const recipient = ref('')
const message = ref('')
const mailboxId = ref('')
const sessionId = ref('')
// Satu id per percobaan: klik ganda / retry jaringan tidak mengirim dua kali.
const requestId = ref('')
const errorMessage = ref('')
const failedSend = ref<QuotationSend | null>(null)

const contactName = computed(() =>
  [props.contact?.first_name, props.contact?.last_name].filter(Boolean).join(' '),
)

function newRequestId() {
  requestId.value = crypto.randomUUID()
}

function reset() {
  const firstEnabled = (['email', 'whatsapp'] as const).find((c) => props.availability[c].enabled)
  channel.value = firstEnabled ?? 'email'
  mode.value = 'text_pdf'
  recipient.value = props.contact?.email ?? ''
  message.value = defaultOpening(contactName.value, props.quotation.quotation_number)
  mailboxId.value = props.mailboxes?.[0]?.id ?? ''
  sessionId.value = props.sessions?.[0]?.id ?? ''
  errorMessage.value = ''
  failedSend.value = null
  newRequestId()
}

watch(
  () => props.open,
  (open) => {
    if (open) reset()
  },
  { immediate: true },
)

// Preview mengikuti pesan pembuka dengan jeda agar tidak memanggil API per ketikan.
const debouncedMessage = ref(message.value)
let timer: ReturnType<typeof setTimeout> | undefined
watch(message, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    debouncedMessage.value = value
  }, 400)
})
watch(
  () => props.open,
  (open) => {
    if (open) debouncedMessage.value = message.value
  },
  { immediate: true },
)
onBeforeUnmount(() => clearTimeout(timer))

const summaryQuery = useQuotationSummaryQuery(
  computed(() => props.quotation.id),
  debouncedMessage,
  computed(() => props.open && mode.value !== 'pdf'),
)
const summary = computed(() => summaryQuery.data.value)

const recipientInvalid = computed(() => channel.value === 'email' && !isValidEmail(recipient.value))
const canSubmit = computed(
  () =>
    props.availability[channel.value].enabled &&
    !recipientInvalid.value &&
    !sendMutation.isPending.value,
)
const showResendPdf = computed(
  () =>
    channel.value === 'whatsapp' &&
    failedSend.value?.mode === 'text_pdf' &&
    (failedSend.value.error ?? '').startsWith('Teks terkirim'),
)

function serverMessage(error: unknown) {
  return (error as { response?: { data?: { message?: string } } } | null)?.response?.data?.message
}

async function submit(overrideMode?: SendMode) {
  if (!canSubmit.value) return
  errorMessage.value = ''
  try {
    const result = await sendMutation.mutateAsync({
      id: props.quotation.id,
      payload: buildSendPayload(
        {
          channel: channel.value,
          mode: overrideMode ?? mode.value,
          recipient: recipient.value,
          message: message.value,
          mailboxId: mailboxId.value,
          sessionId: sessionId.value,
        },
        requestId.value,
      ),
    })
    if (result.send.status === 'sent') {
      toast.success(`Penawaran terkirim via ${channelLabel[channel.value]}.`)
      emit('sent', result)
      emit('close')
      return
    }
    failedSend.value = result.send
    errorMessage.value = result.send.error || 'Penawaran gagal dikirim.'
  } catch (error) {
    const code = quotationErrorCode(error)
    if (code === 'CHANNEL_UNAVAILABLE')
      errorMessage.value = serverMessage(error) ?? 'Kanal tidak tersedia.'
    else if (code === 'QUOTATION_NOT_SENDABLE')
      errorMessage.value = 'Quotation dengan status ini tidak bisa dikirim.'
    else if (code === 'FORBIDDEN') errorMessage.value = 'Anda tidak punya izin untuk kanal ini.'
    else if (code === 'QUOTATION_PDF_FAILED')
      errorMessage.value = 'PDF tidak dapat dibuat. Coba lagi beberapa saat lagi.'
    else errorMessage.value = 'Penawaran gagal dikirim. Coba lagi.'
  }
}

function retry(overrideMode?: SendMode) {
  newRequestId()
  failedSend.value = null
  void submit(overrideMode)
}

const inputClass =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950'
</script>

<template>
  <BaseModal :open="open" :title="`Kirim ${quotation.quotation_number}`" @close="emit('close')">
    <form class="space-y-4 text-sm" @submit.prevent="submit()">
      <fieldset class="space-y-2">
        <legend class="font-medium">Kanal</legend>
        <label
          v-for="c in ['email', 'whatsapp'] as const"
          :key="c"
          class="flex items-start gap-2"
          :class="{ 'opacity-60': !availability[c].enabled }"
        >
          <input
            v-model="channel"
            type="radio"
            name="send-channel"
            :value="c"
            :disabled="!availability[c].enabled"
            class="mt-0.5"
          />
          <span>
            {{ channelLabel[c] }}
            <span v-if="availability[c].reason" class="block text-xs text-gray-500">{{
              availability[c].reason
            }}</span>
          </span>
        </label>
      </fieldset>

      <fieldset class="space-y-2">
        <legend class="font-medium">Isi</legend>
        <div class="flex flex-wrap gap-4">
          <label v-for="m in modes" :key="m.value" class="flex items-center gap-2">
            <input v-model="mode" type="radio" name="send-mode" :value="m.value" />
            {{ m.label }}
          </label>
        </div>
      </fieldset>

      <template v-if="channel === 'email'">
        <label class="block space-y-1">
          <span class="font-medium">Penerima</span>
          <input v-model="recipient" type="email" name="recipient" :class="inputClass" />
          <span v-if="recipient && recipientInvalid" class="block text-xs text-red-600"
            >Alamat email belum valid.</span
          >
        </label>
        <label v-if="(mailboxes?.length ?? 0) > 1" class="block space-y-1">
          <span class="font-medium">Dari mailbox</span>
          <select v-model="mailboxId" name="mailbox" :class="inputClass">
            <option v-for="mb in mailboxes" :key="mb.id" :value="mb.id">
              {{ mb.email_address }}
            </option>
          </select>
        </label>
      </template>
      <template v-else>
        <p class="text-gray-600 dark:text-gray-400">
          Dikirim ke {{ contact?.phone || 'nomor kontak' }}
        </p>
        <label v-if="(sessions?.length ?? 0) > 1" class="block space-y-1">
          <span class="font-medium">Dari nomor</span>
          <select v-model="sessionId" name="session" :class="inputClass">
            <option v-for="s in sessions" :key="s.id" :value="s.id">
              {{ s.display_name || s.id }}
            </option>
          </select>
        </label>
      </template>

      <label class="block space-y-1">
        <span class="font-medium">Pesan pembuka</span>
        <textarea v-model="message" name="message" rows="3" maxlength="2000" :class="inputClass" />
      </label>

      <div class="space-y-1">
        <span class="font-medium">Preview</span>
        <div
          class="max-h-56 overflow-y-auto rounded-lg border bg-gray-50 p-3 text-xs dark:bg-gray-900"
        >
          <template v-if="mode === 'pdf'">
            <p class="whitespace-pre-wrap">{{ message }}</p>
            <p class="mt-2 font-medium">Lampiran: {{ quotation.quotation_number }}.pdf</p>
          </template>
          <template v-else>
            <p v-if="channel === 'email' && summary" class="mb-2 font-semibold">
              Subjek: {{ summary.subject }}
            </p>
            <p v-if="summaryQuery.isPending.value" class="text-gray-500">Memuat preview...</p>
            <pre v-else class="whitespace-pre-wrap font-mono">{{ summary?.text }}</pre>
            <p v-if="mode === 'text_pdf'" class="mt-2 font-medium">
              Lampiran: {{ quotation.quotation_number }}.pdf
            </p>
          </template>
        </div>
      </div>

      <div v-if="errorMessage" class="space-y-2 text-red-600" role="alert">
        <p>{{ errorMessage }}</p>
        <div v-if="failedSend" class="flex flex-wrap gap-2">
          <BaseButton variant="outline" :disabled="sendMutation.isPending.value" @click="retry()">
            Coba lagi
          </BaseButton>
          <BaseButton
            v-if="showResendPdf"
            variant="outline"
            :disabled="sendMutation.isPending.value"
            @click="retry('pdf')"
          >
            Kirim ulang PDF
          </BaseButton>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <BaseButton variant="secondary" @click="emit('close')">Batal</BaseButton>
        <BaseButton type="submit" :disabled="!canSubmit">
          {{ sendMutation.isPending.value ? 'Mengirim...' : 'Kirim' }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
