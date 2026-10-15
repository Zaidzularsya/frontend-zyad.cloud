<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { CheckCircle2, Copy } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import TextField from '@/components/form/TextField.vue'
import { useToast } from '@/components/ui/toast'
import {
  usePairingCodeMutation,
  useSessionQRQuery,
  useSessionStatusQuery,
  useStartSessionMutation,
} from '@/features/whatsapp/api/whatsapp.queries'
import type { SessionStatus, WhatsAppSession } from '@/features/whatsapp/types'
import { whatsappErrorCode, whatsappErrorMessage } from '@/features/whatsapp/utils/errors'
import { formatPhone, normalizePhone } from '@/features/whatsapp/utils/session-status'

const CLOSE_AFTER_CONNECT_MS = 1500

const props = defineProps<{
  open: boolean
  session: WhatsAppSession | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'connected', session: WhatsAppSession): void
}>()

const toast = useToast()
type Tab = 'qr' | 'code'
const tab = ref<Tab>('qr')

const sessionId = computed(() => props.session?.id ?? '')
const polling = computed(() => props.open && Boolean(props.session))
const statusQuery = useSessionStatusQuery(sessionId, polling)

const current = computed<WhatsAppSession | null>(
  () => statusQuery.data.value ?? props.session ?? null,
)
const status = computed<SessionStatus | undefined>(() => current.value?.status)
const connected = computed(() => status.value === 'WORKING')
const stopped = computed(() => status.value === 'FAILED' || status.value === 'STOPPED')

const qrEnabled = computed(
  () => polling.value && tab.value === 'qr' && status.value === 'SCAN_QR_CODE',
)
const qrQuery = useSessionQRQuery(sessionId, qrEnabled)
// A 409 NOT_SCANNING while WAHA is still starting is expected: keep waiting.
const qrError = computed(() => {
  const error = qrQuery.error.value
  if (!error || whatsappErrorCode(error) === 'WHATSAPP_SESSION_NOT_SCANNING') return ''
  return whatsappErrorMessage(error)
})

// --- pairing code ---
const phone = ref('')
const phoneError = ref('')
const pairingCode = ref('')
const pairingMutation = usePairingCodeMutation()

async function requestCode() {
  phoneError.value = ''
  if (!normalizePhone(phone.value)) {
    phoneError.value = 'Masukkan nomor WhatsApp yang valid, contoh 0812 3456 7890.'
    return
  }
  if (!props.session) return
  try {
    pairingCode.value = await pairingMutation.mutateAsync({
      id: props.session.id,
      phone: phone.value,
    })
  } catch (error) {
    phoneError.value = whatsappErrorMessage(error)
  }
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(pairingCode.value)
    toast.success('Kode pairing disalin.')
  } catch {
    toast.error('Tidak bisa menyalin otomatis. Salin kode secara manual.')
  }
}

// --- restart when failed/stopped ---
const startMutation = useStartSessionMutation()
async function restart() {
  if (!props.session) return
  try {
    await startMutation.mutateAsync(props.session.id)
    await statusQuery.refetch()
  } catch (error) {
    toast.error(whatsappErrorMessage(error))
  }
}

// --- lifecycle ---
let closeTimer: ReturnType<typeof setTimeout> | undefined

watch(
  () => props.open,
  (open) => {
    if (open) {
      tab.value = 'qr'
      phone.value = ''
      phoneError.value = ''
      pairingCode.value = ''
    } else if (closeTimer) {
      clearTimeout(closeTimer)
      closeTimer = undefined
    }
  },
)

watch(connected, (isConnected) => {
  if (!isConnected || !props.open || !current.value) return
  emit('connected', current.value)
  closeTimer = setTimeout(() => emit('close'), CLOSE_AFTER_CONNECT_MS)
})

onBeforeUnmount(() => {
  if (closeTimer) clearTimeout(closeTimer)
})

const tabs: { id: Tab; label: string }[] = [
  { id: 'qr', label: 'Scan QR' },
  { id: 'code', label: 'Kode pairing' },
]
</script>

<template>
  <BaseModal :open="open" title="Hubungkan WhatsApp" @close="$emit('close')">
    <div v-if="connected" class="py-6 text-center" role="status">
      <CheckCircle2 class="mx-auto size-10 text-green-600 dark:text-green-400" aria-hidden="true" />
      <p class="mt-3 font-semibold text-gray-900 dark:text-gray-100">Terhubung</p>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
        {{ formatPhone(current?.phone) || 'Nomor WhatsApp' }} siap dipakai.
      </p>
    </div>

    <div v-else-if="stopped" class="space-y-4 py-2">
      <p class="text-sm text-gray-700 dark:text-gray-300">
        Koneksi {{ status === 'FAILED' ? 'gagal' : 'berhenti' }}. Nyalakan lagi untuk mendapatkan QR
        baru.
      </p>
      <BaseButton :disabled="startMutation.isPending.value" @click="restart">
        {{ startMutation.isPending.value ? 'Menyalakan...' : 'Nyalakan koneksi' }}
      </BaseButton>
    </div>

    <div v-else>
      <div
        role="tablist"
        aria-label="Cara pairing"
        class="mb-5 flex gap-1 border-b dark:border-gray-800"
      >
        <button
          v-for="item in tabs"
          :id="`wa-tab-${item.id}`"
          :key="item.id"
          type="button"
          role="tab"
          :aria-selected="tab === item.id"
          :aria-controls="`wa-panel-${item.id}`"
          class="-mb-px border-b-2 px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand-500"
          :class="
            tab === item.id
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
          "
          @click="tab = item.id"
        >
          {{ item.label }}
        </button>
      </div>

      <section
        v-if="tab === 'qr'"
        id="wa-panel-qr"
        role="tabpanel"
        aria-labelledby="wa-tab-qr"
        class="flex flex-col items-center gap-4 sm:flex-row sm:items-start"
      >
        <div
          class="flex size-64 shrink-0 items-center justify-center rounded-lg border bg-white p-2 dark:border-gray-700"
        >
          <img
            v-if="qrQuery.data.value?.qr"
            :src="qrQuery.data.value.qr"
            alt="Kode QR untuk menautkan WhatsApp"
            class="size-full"
          />
          <p v-else-if="qrError" class="px-4 text-center text-sm text-red-600" role="alert">
            {{ qrError }}
          </p>
          <p v-else class="px-4 text-center text-sm text-gray-600">Menyiapkan kode QR...</p>
        </div>
        <ol class="list-decimal space-y-2 pl-5 text-sm text-gray-700 dark:text-gray-300">
          <li>Buka WhatsApp di HP yang nomornya akan dihubungkan.</li>
          <li>
            Ketuk <strong>Perangkat tertaut</strong>, lalu <strong>Tautkan perangkat</strong>.
          </li>
          <li>Arahkan kamera ke kode QR ini. Kode diperbarui otomatis.</li>
        </ol>
      </section>

      <section
        v-else
        id="wa-panel-code"
        role="tabpanel"
        aria-labelledby="wa-tab-code"
        class="space-y-4"
      >
        <form v-if="!pairingCode" class="space-y-3" @submit.prevent="requestCode">
          <TextField
            v-model="phone"
            name="pairing_phone"
            label="Nomor WhatsApp yang akan dihubungkan"
            type="tel"
            placeholder="0812 3456 7890"
            autocomplete="tel"
            :error="phoneError"
          />
          <BaseButton
            type="submit"
            :disabled="pairingMutation.isPending.value || status !== 'SCAN_QR_CODE'"
          >
            {{ pairingMutation.isPending.value ? 'Meminta kode...' : 'Minta kode pairing' }}
          </BaseButton>
          <p v-if="status !== 'SCAN_QR_CODE'" class="text-sm text-gray-600 dark:text-gray-400">
            Menunggu koneksi siap untuk pairing...
          </p>
        </form>

        <div v-else class="space-y-4">
          <div class="flex items-center gap-3">
            <p
              class="font-mono text-3xl font-semibold tracking-widest text-gray-900 dark:text-gray-100"
              aria-label="Kode pairing"
            >
              {{ pairingCode }}
            </p>
            <button
              type="button"
              class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-brand-500 dark:hover:bg-gray-800"
              aria-label="Salin kode pairing"
              @click="copyCode"
            >
              <Copy class="size-5" />
            </button>
          </div>
          <ol class="list-decimal space-y-2 pl-5 text-sm text-gray-700 dark:text-gray-300">
            <li>
              Buka WhatsApp di HP dengan nomor {{ formatPhone(normalizePhone(phone) ?? '') }}.
            </li>
            <li>
              Ketuk <strong>Perangkat tertaut</strong>, <strong>Tautkan perangkat</strong>, lalu
              <strong>Tautkan dengan nomor telepon</strong>.
            </li>
            <li>Masukkan kode di atas.</li>
          </ol>
          <button
            type="button"
            class="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
            @click="pairingCode = ''"
          >
            Pakai nomor lain
          </button>
        </div>
      </section>
    </div>
  </BaseModal>
</template>
