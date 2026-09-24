<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import TextField from '@/components/form/TextField.vue'
import {
  useCreateSessionMutation,
  useUpdateSessionMutation,
} from '@/features/whatsapp/api/whatsapp.queries'
import type { SessionPurpose, WhatsAppSession } from '@/features/whatsapp/types'
import { whatsappErrorMessage } from '@/features/whatsapp/utils/errors'
import { purposeLabels } from '@/features/whatsapp/utils/session-status'

const RISK_ACK_KEY = 'zyad.whatsapp.riskAck'

const props = defineProps<{
  open: boolean
  /** Edit this session; create a new one when absent. */
  session?: WhatsAppSession | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', session: WhatsAppSession, created: boolean): void
}>()

const createMutation = useCreateSessionMutation()
const updateMutation = useUpdateSessionMutation()

const isEdit = computed(() => Boolean(props.session))
const form = reactive({
  display_name: '',
  purpose: 'sales' as SessionPurpose,
  auto_create_lead: false,
})
const errorMessage = ref('')
const riskAcknowledged = ref(false)
const showRiskNotice = ref(false)

function readRiskAck(): boolean {
  try {
    return window.localStorage.getItem(RISK_ACK_KEY) === '1'
  } catch {
    return false
  }
}

function storeRiskAck() {
  try {
    window.localStorage.setItem(RISK_ACK_KEY, '1')
  } catch {
    // Storage unavailable (private mode): the notice simply shows again next time.
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    errorMessage.value = ''
    form.display_name = props.session?.display_name ?? ''
    form.purpose = props.session?.purpose ?? 'sales'
    form.auto_create_lead = props.session?.auto_create_lead ?? false
    showRiskNotice.value = !props.session && !readRiskAck()
    riskAcknowledged.value = false
  },
  { immediate: true },
)

const pending = computed(() => createMutation.isPending.value || updateMutation.isPending.value)
const canSubmit = computed(
  () => !pending.value && (!showRiskNotice.value || riskAcknowledged.value),
)

async function submit() {
  if (!canSubmit.value) return
  errorMessage.value = ''
  const payload = {
    display_name: form.display_name.trim(),
    purpose: form.purpose,
    auto_create_lead: form.auto_create_lead,
  }
  try {
    if (props.session) {
      const saved = await updateMutation.mutateAsync({ id: props.session.id, payload })
      emit('saved', saved, false)
    } else {
      const saved = await createMutation.mutateAsync(payload)
      if (showRiskNotice.value) storeRiskAck()
      emit('saved', saved, true)
    }
  } catch (error) {
    errorMessage.value = whatsappErrorMessage(error)
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="isEdit ? 'Pengaturan nomor WhatsApp' : 'Hubungkan nomor WhatsApp'"
    @close="$emit('close')"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <TextField
        v-model="form.display_name"
        name="display_name"
        label="Nama koneksi"
        placeholder="Contoh: Sales Jakarta"
      />

      <label class="block">
        <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Dipakai untuk
        </span>
        <select
          v-model="form.purpose"
          name="purpose"
          class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100 dark:bg-gray-950 dark:focus:ring-brand-900"
        >
          <option v-for="(label, value) in purposeLabels" :key="value" :value="value">
            {{ label }}
          </option>
        </select>
      </label>

      <label class="flex items-start gap-3 text-sm">
        <input
          v-model="form.auto_create_lead"
          type="checkbox"
          class="mt-0.5 size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
        />
        <span>
          <span class="font-medium text-gray-800 dark:text-gray-200">Buat lead otomatis</span>
          <span class="block text-gray-500 dark:text-gray-400">
            Nomor yang belum ada di CRM dibuatkan lead baru saat pertama kali mengirim pesan.
          </span>
        </span>
      </label>

      <div
        v-if="showRiskNotice"
        class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
      >
        <p>
          Koneksi ini memakai WhatsApp Web, bukan WhatsApp Business API resmi. Nomor bisa diblokir
          WhatsApp bila dipakai untuk kirim massal atau broadcast. Gunakan untuk percakapan satu per
          satu dengan pelanggan.
        </p>
        <label class="mt-2 flex items-center gap-2 font-medium">
          <input
            v-model="riskAcknowledged"
            type="checkbox"
            class="size-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
          />
          Saya mengerti
        </label>
      </div>

      <p v-if="errorMessage" class="text-sm text-red-600 dark:text-red-400" role="alert">
        {{ errorMessage }}
      </p>

      <div class="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <BaseButton variant="outline" @click="$emit('close')">Batal</BaseButton>
        <BaseButton type="submit" :disabled="!canSubmit">
          {{ pending ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Lanjut ke pairing' }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
