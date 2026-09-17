<script setup lang="ts">
import { computed, ref } from 'vue'
import { PencilLine, Plus } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import PermissionGate from '@/components/common/PermissionGate.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import AccountFormModal from '@/features/finance/components/AccountFormModal.vue'
import { useFinanceAccountsQuery } from '@/features/finance/api/coa.queries'
import type { FinanceAccount } from '@/features/finance/api/coa.api'
import { formatFinanceAmount } from '@/features/finance/utils/format'

const includeInactive = ref(false)
const accountsQuery = useFinanceAccountsQuery(
  computed(() => ({ include_inactive: includeInactive.value })),
)

const modalOpen = ref(false)
const editingAccount = ref<FinanceAccount | null>(null)

function openCreate() {
  editingAccount.value = null
  modalOpen.value = true
}

function openEdit(account: FinanceAccount) {
  editingAccount.value = account
  modalOpen.value = true
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Chart of Accounts"
      description="Daftar akun pembukuan PT Zyad Technovation, dikelompokkan per kategori."
    >
      <PermissionGate permission="platform.finance.coa.manage">
        <BaseButton @click="openCreate"> <Plus class="size-4" /> Akun Baru </BaseButton>
      </PermissionGate>
    </PageHeader>

    <BaseCard>
      <div class="mb-3 flex items-center justify-between">
        <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input v-model="includeInactive" type="checkbox" />
          Tampilkan akun nonaktif
        </label>
      </div>

      <p v-if="accountsQuery.isLoading.value" class="text-sm text-gray-500">Memuat akun...</p>
      <table v-else class="w-full text-sm">
        <thead>
          <tr
            class="border-b text-left text-xs font-medium uppercase text-gray-500 dark:border-gray-800"
          >
            <th class="px-3 py-2">Kode</th>
            <th class="px-3 py-2">Nama Akun</th>
            <th class="px-3 py-2">Kategori</th>
            <th class="px-3 py-2">Saldo Normal</th>
            <th class="px-3 py-2 text-right">Saldo Awal</th>
            <th class="px-3 py-2">Status</th>
            <th class="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="account in accountsQuery.data.value ?? []"
            :key="account.id"
            class="border-b last:border-0 dark:border-gray-800"
            :class="{ 'font-semibold': account.is_header }"
          >
            <td class="px-3 py-2">{{ account.account_code }}</td>
            <td class="px-3 py-2">{{ account.account_name }}</td>
            <td class="px-3 py-2 text-gray-500">{{ account.account_category_name }}</td>
            <td class="px-3 py-2 capitalize text-gray-500">{{ account.normal_balance }}</td>
            <td class="px-3 py-2 text-right tabular-nums">
              {{ formatFinanceAmount(account.opening_balance) }}
            </td>
            <td class="px-3 py-2">
              <span
                class="rounded-full px-2 py-0.5 text-xs"
                :class="
                  account.is_active
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                "
              >
                {{ account.is_active ? 'Aktif' : 'Nonaktif' }}
              </span>
            </td>
            <td class="px-3 py-2 text-right">
              <PermissionGate permission="platform.finance.coa.manage">
                <button class="text-gray-400 hover:text-brand-600" @click="openEdit(account)">
                  <PencilLine class="size-4" />
                </button>
              </PermissionGate>
            </td>
          </tr>
        </tbody>
      </table>
    </BaseCard>

    <AccountFormModal
      :open="modalOpen"
      :account="editingAccount"
      @close="modalOpen = false"
      @saved="accountsQuery.refetch()"
    />
  </div>
</template>
