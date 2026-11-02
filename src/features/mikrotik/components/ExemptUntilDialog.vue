<script setup lang="ts">
import { ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useSetPolicyMutation } from '@/features/mikrotik/api/mikrotik.queries'
import { routerActionError } from '@/features/mikrotik/utils/errors'
import { formatDateId, wibToday } from '@/features/mikrotik/utils/preview'

const props = defineProps<{ open: boolean; accountId: string; accountName?: string }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'saved'): void }>()

const until = ref('')
const reason = ref('')
const untilError = ref('')
const reasonError = ref('')
const error = ref('')
const mutation = useSetPolicyMutation()

// Form selalu mulai bersih setiap dialog dibuka.
watch(
  () => props.open,
  (open) => {
    if (!open) return
    until.value = ''
    reason.value = ''
    untilError.value = ''
    reasonError.value = ''
    error.value = ''
  },
)

async function submit() {
  const text = reason.value.trim()
  const today = wibToday()
  untilError.value = !until.value
    ? 'Tanggal wajib diisi.'
    : until.value < today
      ? `Tanggal tidak boleh sebelum hari ini (${formatDateId(today)}).`
      : ''
  // Batas sama dengan validasi backend (1-500).
  reasonError.value = !text
    ? 'Alasan wajib diisi.'
    : text.length > 500
      ? 'Maksimal 500 karakter'
      : ''
  if (untilError.value || reasonError.value) return
  error.value = ''
  try {
    await mutation.mutateAsync({
      accountId: props.accountId,
      payload: { exempt: true, reason: text, exempted_until: until.value },
    })
    emit('saved')
    emit('close')
  } catch (e) {
    error.value = routerActionError(e)
  }
}
</script>

<template>
  <BaseModal :open="open" title="Beri Pengecualian" @close="emit('close')">
    <form class="space-y-4 text-sm" novalidate @submit.prevent="submit">
      <p>
        Pelanggan{{ accountName ? ` ${accountName}` : '' }} tidak akan diisolir otomatis sampai
        tanggal yang dipilih. Tanggal itu masih termasuk (hari terakhir pengecualian, waktu WIB).
      </p>
      <div>
        <label class="font-medium" for="exempt-until">Dikecualikan sampai</label>
        <input
          id="exempt-until"
          v-model="until"
          name="exempted_until"
          type="date"
          :min="wibToday()"
          :aria-invalid="untilError ? 'true' : undefined"
          :aria-describedby="untilError ? 'exempt-until-err' : undefined"
          class="mt-1 block w-full rounded-lg border bg-white p-2 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100 sm:w-56 dark:bg-gray-950 dark:focus:ring-brand-900"
        />
        <p v-if="untilError" id="exempt-until-err" class="mt-1 text-red-700" role="alert">
          {{ untilError }}
        </p>
      </div>
      <div>
        <label class="font-medium" for="exempt-reason">Alasan</label>
        <textarea
          id="exempt-reason"
          v-model="reason"
          name="reason"
          maxlength="500"
          rows="3"
          :aria-invalid="reasonError ? 'true' : undefined"
          :aria-describedby="reasonError ? 'exempt-reason-err' : undefined"
          class="mt-1 w-full rounded-lg border bg-white p-2 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:bg-gray-950 dark:focus:ring-brand-900"
        ></textarea>
        <p v-if="reasonError" id="exempt-reason-err" class="mt-1 text-red-700" role="alert">
          {{ reasonError }}
        </p>
      </div>
      <p v-if="error" class="text-red-700" role="alert">{{ error }}</p>
      <div class="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <BaseButton variant="outline" @click="emit('close')">Batal</BaseButton>
        <BaseButton type="submit" :disabled="mutation.isPending.value">Simpan</BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
