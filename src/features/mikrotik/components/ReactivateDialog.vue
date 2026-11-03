<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useSetModeMutation } from '@/features/mikrotik/api/mikrotik.queries'
import CandidateTable from '@/features/mikrotik/components/CandidateTable.vue'
import type { PreviewSummary, SetModePayload } from '@/features/mikrotik/types'
import { controlActionError } from '@/features/mikrotik/utils/errors'
import { formatDateId, wibToday } from '@/features/mikrotik/utils/preview'

// Batas backend untuk exemptions.account_ids.
const MAX_ACCOUNTS = 500

const props = defineProps<{ open: boolean; summary: PreviewSummary; canUpdate: boolean }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'activated'): void }>()

const selected = ref<string[]>([])
const until = ref('')
const reason = ref('')
const untilError = ref('')
const reasonError = ref('')
const error = ref('')
const mutation = useSetModeMutation()

watch(
  () => props.open,
  (open) => {
    if (!open) return
    selected.value = []
    until.value = ''
    reason.value = ''
    untilError.value = ''
    reasonError.value = ''
    error.value = ''
  },
)
watch(until, () => (untilError.value = ''))
watch(reason, () => (reasonError.value = ''))

const count = computed(() => selected.value.length)
const buttonLabel = computed(() =>
  count.value > 0
    ? `Aktifkan & Beri Pengecualian pada ${count.value} Pelanggan Terpilih`
    : 'Aktifkan Tanpa Pengecualian',
)

async function submit() {
  if (!props.canUpdate) return
  error.value = ''
  let payload: SetModePayload = { mode: 'active' }
  if (count.value > 0) {
    const text = reason.value.trim()
    const today = wibToday()
    untilError.value = !until.value
      ? 'Tanggal wajib diisi.'
      : until.value < today
        ? `Tanggal tidak boleh sebelum hari ini (${formatDateId(today)}).`
        : ''
    reasonError.value = !text
      ? 'Alasan wajib diisi.'
      : text.length > 500
        ? 'Maksimal 500 karakter'
        : ''
    if (count.value > MAX_ACCOUNTS) {
      error.value = `Maksimal ${MAX_ACCOUNTS} pelanggan per aktivasi. Kurangi pilihan Anda.`
      return
    }
    if (untilError.value || reasonError.value) return
    payload = {
      mode: 'active',
      exemptions: { account_ids: [...selected.value], reason: text, until: until.value },
    }
  }
  try {
    await mutation.mutateAsync(payload)
    emit('activated')
    emit('close')
  } catch (e) {
    error.value = controlActionError(e)
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    title="Aktifkan Kembali Isolir Otomatis"
    width-class="max-w-4xl"
    @close="emit('close')"
  >
    <!-- Bukan <form>: Enter pada kolom cari tabel tidak boleh mengaktifkan mode. -->
    <div class="space-y-4 text-sm">
      <p class="rounded-lg border p-3 font-medium" role="status" data-testid="reactivate-summary">
        {{ summary.target }} pelanggan akan diisolir ulang dalam 2 menit
      </p>
      <p>
        Centang pelanggan yang perlu diberi kelonggaran sebelum isolir otomatis kembali berjalan.
        Pelanggan yang tidak dicentang akan langsung diproses.
      </p>

      <CandidateTable
        selectable
        :summary="summary"
        :can-update="canUpdate"
        :selected="selected"
        @update:selected="selected = $event"
      />

      <div v-if="count > 0" class="grid gap-4 sm:grid-cols-[14rem_1fr]">
        <div>
          <label class="font-medium" for="reactivate-until">Dikecualikan sampai</label>
          <input
            id="reactivate-until"
            v-model="until"
            name="until"
            type="date"
            :min="wibToday()"
            :aria-invalid="untilError ? 'true' : undefined"
            :aria-describedby="untilError ? 'reactivate-until-err' : undefined"
            class="mt-1 block w-full rounded-lg border bg-white p-2 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:bg-gray-950 dark:focus:ring-brand-900"
          />
          <p v-if="untilError" id="reactivate-until-err" class="mt-1 text-red-700" role="alert">
            {{ untilError }}
          </p>
        </div>
        <div>
          <label class="font-medium" for="reactivate-reason">Alasan</label>
          <textarea
            id="reactivate-reason"
            v-model="reason"
            name="reason"
            maxlength="500"
            rows="2"
            :aria-invalid="reasonError ? 'true' : undefined"
            :aria-describedby="reasonError ? 'reactivate-reason-err' : undefined"
            class="mt-1 w-full rounded-lg border bg-white p-2 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:bg-gray-950 dark:focus:ring-brand-900"
          ></textarea>
          <p v-if="reasonError" id="reactivate-reason-err" class="mt-1 text-red-700" role="alert">
            {{ reasonError }}
          </p>
        </div>
      </div>

      <p v-if="error" class="text-red-700" role="alert">{{ error }}</p>
      <div class="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <BaseButton variant="outline" @click="emit('close')">Batal</BaseButton>
        <BaseButton :disabled="mutation.isPending.value" @click="submit">{{
          buttonLabel
        }}</BaseButton>
      </div>
    </div>
  </BaseModal>
</template>
