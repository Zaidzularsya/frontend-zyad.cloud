<script setup lang="ts">
import { computed, ref } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useToast } from '@/components/ui/toast'
import { useControlQuery } from '@/features/mikrotik/api/mikrotik.queries'
import { useMikrotikEnabled } from '@/features/mikrotik/composables/useMikrotikEnabled'
import type { Invoice } from '@/features/receivable/api/receivable.api'
import { useSetIsolirFlagMutation } from '@/features/receivable/api/receivable.queries'
import { receivableErrorMessage } from '@/features/receivable/utils/errors'
import { useAuthStore } from '@/stores/auth.store'

// Isolation flag of an arrears invoice. Only the owner (invoice.isolir_flag) changes it;
// turning it on in active mode asks first because the customer can be isolated right away.
const props = defineProps<{ invoice: Invoice }>()

const auth = useAuthStore()
const toast = useToast()
const mikrotikOn = useMikrotikEnabled()
const open = computed(() => props.invoice.status === 'issued' || props.invoice.status === 'overdue')
const canChange = computed(() => open.value && auth.can('invoice.isolir_flag'))
const control = useControlQuery(computed(() => canChange.value && mikrotikOn.value))
const needsConfirm = computed(() => control.data.value?.mode === 'active' || control.isError.value)

const mutation = useSetIsolirFlagMutation()
const confirmOpen = ref(false)
const errorMessage = ref('')

async function save(value: boolean) {
  errorMessage.value = ''
  try {
    await mutation.mutateAsync({ id: props.invoice.id, value })
    toast.success(value ? 'Tunggakan ikut isolir.' : 'Tunggakan tidak ikut isolir.')
  } catch (error) {
    errorMessage.value = receivableErrorMessage(error, 'Penanda gagal diubah. Coba lagi.')
  }
}

function onChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.checked && needsConfirm.value) {
    input.checked = false
    confirmOpen.value = true
    return
  }
  void save(input.checked)
}

async function confirm() {
  confirmOpen.value = false
  await save(true)
}
</script>

<template>
  <div class="space-y-1 text-sm">
    <label v-if="canChange" class="inline-flex items-center gap-2">
      <input
        type="checkbox"
        name="isolir_flag"
        :checked="invoice.isolir_flag"
        :disabled="mutation.isPending.value"
        @change="onChange"
      />
      <span>Ikut isolir</span>
    </label>
    <p v-else>{{ invoice.isolir_flag ? 'Ikut isolir' : 'Tidak ikut isolir' }}</p>
    <p class="text-xs text-gray-500">
      Berefek hanya bila kontrak pelanggan punya produk pemicu isolir yang aktif.
    </p>
    <p v-if="errorMessage" class="text-red-600" role="alert">{{ errorMessage }}</p>

    <BaseModal :open="confirmOpen" title="Ikutkan ke isolir?" @close="confirmOpen = false">
      <div class="space-y-4 text-sm">
        <p>
          Mode isolir organisasi sedang <strong>aktif</strong>. Tunggakan ini sudah lewat jatuh
          tempo, jadi pelanggan bisa langsung terisolir setelah masa tenggang.
        </p>
        <div class="flex justify-end gap-2">
          <BaseButton variant="secondary" @click="confirmOpen = false">Batal</BaseButton>
          <BaseButton variant="danger" @click="confirm">Ya, ikutkan isolir</BaseButton>
        </div>
      </div>
    </BaseModal>
  </div>
</template>
