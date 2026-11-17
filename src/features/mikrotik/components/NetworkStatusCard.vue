<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import {
  useCustomerStatusQuery,
  usePolicyQuery,
  useSetPolicyMutation,
} from '@/features/mikrotik/api/mikrotik.queries'
import ExemptUntilDialog from '@/features/mikrotik/components/ExemptUntilDialog.vue'
import { routerActionError } from '@/features/mikrotik/utils/errors'
import { exemptionLabel } from '@/features/mikrotik/utils/preview'
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
const pending = computed(() => Boolean(status.value?.pending_isolation) && !isolated.value)
// Tanggal lewat tetap berlabel "berakhir", jadi tidak terbaca sebagai pengecualian aktif.
const untilText = computed(() => exemptionLabel(status.value?.exempted_until ?? null))

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
const error = ref('')
const revokeOpen = ref(false)
const mutation = useSetPolicyMutation()

function openDialog() {
  error.value = ''
  dialogOpen.value = true
}

async function revoke() {
  error.value = ''
  try {
    await mutation.mutateAsync({ accountId: props.accountId, payload: { exempt: false } })
    revokeOpen.value = false
  } catch (e) {
    error.value = routerActionError(e)
    revokeOpen.value = false
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
          <span
            v-if="pending"
            title="Akan diisolir begitu isolir otomatis aktif"
            class="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200"
            >Menunggu Isolir</span
          >
        </p>
        <p class="text-gray-500">{{ status.secrets }} secret terpasang</p>
        <p v-if="isolated" class="text-xs text-gray-500">
          Pelanggan dibuka otomatis setelah tagihan lunas. Untuk memberi kelonggaran, gunakan
          pengecualian.
        </p>
      </div>

      <p v-if="exempt" class="text-sm">
        <span class="font-medium">{{ untilText || 'Dikecualikan' }}</span>
        <span v-if="reasonText" class="text-gray-500">. Alasan: {{ reasonText }}</span>
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
            @click="revokeOpen = true"
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

    <ConfirmDialog
      :open="revokeOpen"
      title="Cabut pengecualian?"
      message="Jika pelanggan punya tagihan jatuh tempo, secret-nya dapat diisolir otomatis dalam sekitar 2 menit."
      confirm-label="Ya, cabut"
      tone="danger"
      :loading="mutation.isPending.value"
      @confirm="revoke"
      @cancel="revokeOpen = false"
    />
    <ExemptUntilDialog
      :open="dialogOpen"
      :account-id="accountId"
      :account-name="contactName"
      @close="dialogOpen = false"
    />
  </BaseCard>
</template>
