<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useToast } from '@/components/ui/toast'
import type { Invoice, InvoiceSend, SendChannel } from '@/features/receivable/api/receivable.api'
import { useSendInvoiceMutation } from '@/features/receivable/api/receivable.queries'
import { receivableErrorCode, receivableErrorMessage } from '@/features/receivable/utils/errors'
import {
  buildSendPayload,
  isValidEmail,
  type ChannelState,
} from '@/features/receivable/utils/send-invoice'

const props = defineProps<{
  open: boolean
  invoice: Invoice
  availability: Record<SendChannel, ChannelState>
  /** Retry: kanal kiriman gagal yang dipilih lebih dulu. */
  initialChannel?: SendChannel
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'sent', send: InvoiceSend): void
}>()

const toast = useToast()
const sendMutation = useSendInvoiceMutation()

const channelLabel: Record<SendChannel, string> = { email: 'Email', whatsapp: 'WhatsApp' }

const channel = ref<SendChannel>('email')
const recipient = ref('')
const message = ref('')
// Satu id per percobaan: klik ganda / retry jaringan tidak mengirim dua kali. Setelah kiriman
// gagal tercatat, "Coba lagi" memakai id baru (id lama hanya mengembalikan catatan gagal itu).
const requestId = ref('')
const errorMessage = ref('')
const failedSend = ref<InvoiceSend | null>(null)

function newRequestId() {
  requestId.value = crypto.randomUUID()
}

function reset() {
  const preferred =
    props.initialChannel && props.availability[props.initialChannel].enabled
      ? props.initialChannel
      : undefined
  const firstEnabled = (['email', 'whatsapp'] as const).find((c) => props.availability[c].enabled)
  channel.value = preferred ?? firstEnabled ?? 'email'
  recipient.value = props.invoice.account.email ?? ''
  message.value = ''
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

const recipientInvalid = computed(() => channel.value === 'email' && !isValidEmail(recipient.value))
const canSubmit = computed(
  () =>
    props.availability[channel.value].enabled &&
    !recipientInvalid.value &&
    !sendMutation.isPending.value,
)

async function submit() {
  if (!canSubmit.value) return
  errorMessage.value = ''
  try {
    const send = await sendMutation.mutateAsync({
      id: props.invoice.id,
      payload: buildSendPayload(
        { channel: channel.value, recipient: recipient.value, message: message.value },
        requestId.value,
      ),
    })
    if (send.status === 'sent') {
      toast.success(`Invoice terkirim via ${channelLabel[channel.value]}.`)
      emit('sent', send)
      emit('close')
      return
    }
    failedSend.value = send
    errorMessage.value = send.error || 'Invoice gagal dikirim.'
  } catch (error) {
    const code = receivableErrorCode(error)
    errorMessage.value =
      code === 'CHANNEL_UNAVAILABLE' || code === 'INVOICE_NOT_SENDABLE' || code === 'FORBIDDEN'
        ? receivableErrorMessage(error)
        : 'Invoice gagal dikirim. Coba lagi.'
  }
}

function retry() {
  newRequestId()
  failedSend.value = null
  void submit()
}

const inputClass =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950'
</script>

<template>
  <BaseModal
    :open="open"
    :title="`Kirim ${invoice.invoice_number ?? 'invoice'}`"
    @close="emit('close')"
  >
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

      <label v-if="channel === 'email'" class="block space-y-1">
        <span class="font-medium">Penerima</span>
        <input v-model="recipient" type="email" name="recipient" :class="inputClass" />
        <span v-if="recipient && recipientInvalid" class="block text-xs text-red-600"
          >Alamat email belum valid.</span
        >
      </label>
      <p v-else class="text-gray-600 dark:text-gray-400">
        Dikirim ke nomor WhatsApp kontak CRM pelanggan ini.
      </p>

      <label class="block space-y-1">
        <span class="font-medium">Pesan pembuka (opsional)</span>
        <textarea
          v-model="message"
          name="message"
          rows="3"
          maxlength="2000"
          :class="inputClass"
          :placeholder="`Halo ${invoice.account.name}, berikut invoice ${invoice.invoice_number ?? ''}…`"
        />
        <span class="block text-xs text-gray-500"
          >Kosongkan untuk memakai kalimat standar. PDF dan link invoice dilampirkan otomatis.</span
        >
      </label>

      <div v-if="errorMessage" class="space-y-2 text-red-600" role="alert">
        <p>{{ errorMessage }}</p>
        <div v-if="failedSend" class="flex flex-wrap gap-2">
          <BaseButton variant="outline" :disabled="sendMutation.isPending.value" @click="retry()">
            Coba lagi
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
