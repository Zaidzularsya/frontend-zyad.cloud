<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { useToast } from '@/components/ui/toast'
import type { SendChannel } from '@/features/receivable/api/receivable.api'
import {
  useReceivableSettingsQuery,
  useSendersQuery,
  useUpdateReceivableSettingsMutation,
} from '@/features/receivable/api/receivable.queries'
import { receivableErrorMessage } from '@/features/receivable/utils/errors'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const toast = useToast()
const canEdit = computed(() => auth.can('receivable.settings'))

const settingsQuery = useReceivableSettingsQuery()
const sendersQuery = useSendersQuery(canEdit)
const senders = computed(() => sendersQuery.data.value ?? [])
const mutation = useUpdateReceivableSettingsMutation()

const leadDays = ref('7')
const termsDays = ref('7')
const channels = ref<SendChannel[]>(['email'])
const senderId = ref('')
const errorMessage = ref('')

watch(
  () => settingsQuery.data.value,
  (s) => {
    if (!s) return
    leadDays.value = String(s.invoice_lead_days)
    termsDays.value = String(s.payment_terms_days)
    channels.value = [...s.default_channels]
    senderId.value = s.default_sender_user_id ?? ''
  },
  { immediate: true },
)

function toggle(channel: SendChannel, on: boolean) {
  const next = new Set(channels.value)
  if (on) next.add(channel)
  else next.delete(channel)
  channels.value = (['email', 'whatsapp'] as const).filter((c) => next.has(c))
}

function validate(): string | null {
  const lead = Number(leadDays.value)
  const terms = Number(termsDays.value)
  if (!Number.isInteger(lead) || lead < 0 || lead > 60)
    return 'Hari kirim sebelum periode harus 0–60.'
  if (!Number.isInteger(terms) || terms < 0 || terms > 90)
    return 'Termin pembayaran harus 0–90 hari.'
  if (channels.value.length === 0) return 'Pilih minimal satu kanal default.'
  return null
}

async function save() {
  errorMessage.value = validate() ?? ''
  if (errorMessage.value) return
  try {
    await mutation.mutateAsync({
      invoice_lead_days: Number(leadDays.value),
      payment_terms_days: Number(termsDays.value),
      default_channels: channels.value,
      default_sender_user_id: senderId.value || undefined,
    })
    toast.success('Pengaturan penagihan disimpan.')
  } catch (error) {
    errorMessage.value = receivableErrorMessage(error, 'Pengaturan gagal disimpan. Coba lagi.')
  }
}

const inputClass =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950 disabled:opacity-60'
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Pengaturan Penagihan"
      description="Default untuk invoice baru dan pengiriman otomatis."
    />
    <p v-if="settingsQuery.isPending.value" class="text-sm text-gray-500">Memuat...</p>
    <BaseCard v-else>
      <form class="space-y-5 text-sm" @submit.prevent="save">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block space-y-1">
            <span class="font-medium">Kirim invoice berulang sebelum periode (hari)</span>
            <input
              v-model="leadDays"
              name="invoice_lead_days"
              type="number"
              min="0"
              max="60"
              :disabled="!canEdit"
              :class="inputClass"
            />
            <span class="block text-xs text-gray-500"
              >0–60. Dipakai penagihan berulang (rilis berikutnya).</span
            >
          </label>
          <label class="block space-y-1">
            <span class="font-medium">Termin pembayaran (hari)</span>
            <input
              v-model="termsDays"
              name="payment_terms_days"
              type="number"
              min="0"
              max="90"
              :disabled="!canEdit"
              :class="inputClass"
            />
            <span class="block text-xs text-gray-500">Jatuh tempo = tanggal terbit + termin.</span>
          </label>
        </div>

        <fieldset class="space-y-2">
          <legend class="font-medium">Kanal pengiriman default</legend>
          <label
            v-for="c in ['email', 'whatsapp'] as const"
            :key="c"
            class="flex items-center gap-2"
          >
            <input
              type="checkbox"
              :name="`channel-${c}`"
              :checked="channels.includes(c)"
              :disabled="!canEdit"
              @change="toggle(c, ($event.target as HTMLInputElement).checked)"
            />
            {{ c === 'email' ? 'Email' : 'WhatsApp' }}
          </label>
        </fieldset>

        <label class="block space-y-1">
          <span class="font-medium">Pengirim default</span>
          <select v-model="senderId" name="default_sender" :disabled="!canEdit" :class="inputClass">
            <option value="">Belum diatur</option>
            <option v-for="s in senders" :key="s.user_id" :value="s.user_id">
              {{ s.name }} ({{ s.email }})
            </option>
          </select>
          <span class="block text-xs text-gray-500">
            Dipakai bila invoice tidak punya PIC. Pengirim memakai mailbox atau nomor WhatsApp
            miliknya; tanpa pengirim, kiriman otomatis dicatat gagal dan Anda diberi tahu.
          </span>
        </label>

        <p v-if="errorMessage" class="text-red-600" role="alert">{{ errorMessage }}</p>
        <div v-if="canEdit" class="flex justify-end">
          <BaseButton type="submit" :disabled="mutation.isPending.value">{{
            mutation.isPending.value ? 'Menyimpan...' : 'Simpan'
          }}</BaseButton>
        </div>
        <p v-else class="text-xs text-gray-500">Anda tidak punya izin mengubah pengaturan ini.</p>
      </form>
    </BaseCard>
  </div>
</template>
