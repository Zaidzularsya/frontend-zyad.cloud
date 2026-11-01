<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import {
  useCustomerStatusQuery,
  usePolicyQuery,
  useSetPolicyMutation,
} from '@/features/mikrotik/api/mikrotik.queries'
import { routerActionError } from '@/features/mikrotik/utils/errors'
import { useInvoicesQuery } from '@/features/receivable/api/receivable.queries'
import { useAuthStore } from '@/stores/auth.store'

const props = defineProps<{ accountId: string; contactName?: string }>()

const auth = useAuthStore()
const canUpdate = computed(() => auth.can('mikrotik_policy.update'))

const accountIds = computed(() => [props.accountId])
const statusQuery = useCustomerStatusQuery(accountIds)
const status = computed(() => statusQuery.data.value?.find((s) => s.account_id === props.accountId))
const isolated = computed(() => status.value?.isolation_state === 'isolated')
const exempt = computed(() => Boolean(status.value?.exempt))

// Alasan pengecualian hanya diminta saat pelanggan memang dikecualikan.
const policyAccountId = computed(() => (exempt.value ? props.accountId : undefined))
const policyQuery = usePolicyQuery(policyAccountId)
const reasonText = computed(() => policyQuery.data.value?.reason ?? '')

// Invoice tertunggak tertua dari akun ini, tujuan "Catat pembayaran".
const showPay = isolated
const overdueParams = computed(() => ({
  page: 1,
  per_page: 50,
  account_id: props.accountId,
  status: 'overdue' as const,
}))
const overdueQuery = useInvoicesQuery(overdueParams, showPay)
const oldestInvoice = computed(() => {
  const rows = overdueQuery.data.value?.data ?? []
  return [...rows].sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))[0]
})

const dialogOpen = ref(false)
const reason = ref('')
const reasonError = ref('')
const error = ref('')
const mutation = useSetPolicyMutation()

function openDialog() {
  reason.value = ''
  reasonError.value = ''
  error.value = ''
  dialogOpen.value = true
}

async function grant() {
  const text = reason.value.trim()
  if (!text) {
    reasonError.value = 'Alasan wajib diisi.'
    return
  }
  // Batas sama dengan validasi backend (max=500).
  if (text.length > 500) {
    reasonError.value = 'Maksimal 500 karakter'
    return
  }
  reasonError.value = ''
  error.value = ''
  try {
    await mutation.mutateAsync({
      accountId: props.accountId,
      payload: { exempt: true, reason: text },
    })
    dialogOpen.value = false
  } catch (e) {
    error.value = routerActionError(e)
  }
}

async function revoke() {
  error.value = ''
  try {
    await mutation.mutateAsync({ accountId: props.accountId, payload: { exempt: false } })
  } catch (e) {
    error.value = routerActionError(e)
  }
}
</script>

<template>
  <BaseCard class="space-y-3 !p-5">
    <h2 class="text-sm font-semibold">Status Jaringan</h2>
    <p v-if="statusQuery.isPending.value" class="text-sm text-gray-500">Memuat status...</p>
    <p v-else-if="statusQuery.isError.value || !status" class="text-sm text-red-600" role="alert">
      Gagal memuat status jaringan.
    </p>
    <template v-else>
      <div
        v-if="status.isolation_state === 'none'"
        class="text-sm text-amber-700 dark:text-amber-300"
      >
        <p class="font-medium">Tidak ada secret terpasang</p>
        <p>Belum ada secret terpasang untuk pelanggan ini</p>
      </div>
      <div v-else class="space-y-1 text-sm">
        <p>
          <span
            class="rounded-full px-2 py-0.5 text-xs font-medium"
            :class="
              isolated
                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200'
                : 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
            "
            >{{ isolated ? 'Terisolir' : 'Aktif' }}</span
          >
        </p>
        <p class="text-gray-500">{{ status.secrets }} secret terpasang</p>
        <p v-if="isolated" class="text-xs text-gray-500">
          Pelanggan dibuka otomatis setelah tagihan lunas. Untuk memberi kelonggaran, gunakan
          pengecualian.
        </p>
      </div>

      <p v-if="exempt" class="text-sm">
        <span class="font-medium">Dikecualikan</span>
        <span v-if="reasonText" class="text-gray-500"> — {{ reasonText }}</span>
      </p>

      <p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>

      <div class="flex flex-wrap items-center gap-2">
        <template v-if="canUpdate">
          <BaseButton
            v-if="!exempt && status.isolation_state !== 'none'"
            variant="outline"
            @click="openDialog"
          >
            Beri Pengecualian
          </BaseButton>
          <!-- Tetap tersedia tanpa secret agar pengecualian lama selalu bisa dicabut. -->
          <BaseButton
            v-else-if="exempt"
            variant="outline"
            :disabled="mutation.isPending.value"
            @click="revoke"
          >
            Cabut Pengecualian
          </BaseButton>
        </template>
        <RouterLink
          v-if="showPay && oldestInvoice"
          :to="{ name: 'billing-invoice-detail', params: { id: oldestInvoice.id } }"
          class="text-sm font-medium text-brand-600"
          >Catat pembayaran</RouterLink
        >
      </div>
    </template>

    <BaseModal :open="dialogOpen" title="Beri Pengecualian" @close="dialogOpen = false">
      <div class="space-y-3 text-sm">
        <p>
          Pelanggan{{ contactName ? ` ${contactName}` : '' }} tidak akan diisolir otomatis selama
          pengecualian aktif.
        </p>
        <label class="block">
          <span class="font-medium">Alasan</span>
          <textarea
            v-model="reason"
            name="reason"
            maxlength="500"
            rows="3"
            class="mt-1 w-full rounded-lg border bg-white p-2 outline-none focus:border-brand-500 dark:bg-gray-950"
          ></textarea>
        </label>
        <p v-if="reasonError" class="text-red-600" role="alert">{{ reasonError }}</p>
        <p v-if="error" class="text-red-600" role="alert">{{ error }}</p>
      </div>
      <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <BaseButton variant="outline" @click="dialogOpen = false">Batal</BaseButton>
        <BaseButton :disabled="mutation.isPending.value" @click="grant">Simpan</BaseButton>
      </div>
    </BaseModal>
  </BaseCard>
</template>
