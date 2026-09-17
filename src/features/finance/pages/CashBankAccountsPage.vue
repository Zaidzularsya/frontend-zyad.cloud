<script setup lang="ts">
import { ref } from 'vue'
import { Plus } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import PermissionGate from '@/components/common/PermissionGate.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import CashBankAccountFormModal from '@/features/finance/components/CashBankAccountFormModal.vue'
import { useFinanceCashBankAccountsQuery } from '@/features/finance/api/cash-bank.queries'

const includeInactive = ref(false)
const accountsQuery = useFinanceCashBankAccountsQuery(includeInactive)
const modalOpen = ref(false)
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Akun Kas & Bank"
      description="Daftar akun kas dan rekening bank yang dipakai untuk mencatat mutasi harian."
    >
      <PermissionGate permission="platform.finance.cashbank.manage">
        <BaseButton @click="modalOpen = true"> <Plus class="size-4" /> Akun Baru </BaseButton>
      </PermissionGate>
    </PageHeader>

    <BaseCard>
      <label class="mb-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <input v-model="includeInactive" type="checkbox" />
        Tampilkan akun nonaktif
      </label>

      <table class="w-full text-sm">
        <thead>
          <tr
            class="border-b text-left text-xs font-medium uppercase text-gray-500 dark:border-gray-800"
          >
            <th class="px-3 py-2">Kode Akun</th>
            <th class="px-3 py-2">Nama</th>
            <th class="px-3 py-2">Jenis</th>
            <th class="px-3 py-2">Bank</th>
            <th class="px-3 py-2">No. Rekening</th>
            <th class="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="account in accountsQuery.data.value ?? []"
            :key="account.id"
            class="border-b last:border-0 dark:border-gray-800"
          >
            <td class="px-3 py-2">{{ account.account_code }}</td>
            <td class="px-3 py-2">{{ account.account_name }}</td>
            <td class="px-3 py-2 capitalize">{{ account.type === 'cash' ? 'Kas' : 'Bank' }}</td>
            <td class="px-3 py-2 text-gray-500">{{ account.bank_name }}</td>
            <td class="px-3 py-2 text-gray-500">{{ account.account_number }}</td>
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
          </tr>
        </tbody>
      </table>
    </BaseCard>

    <CashBankAccountFormModal
      :open="modalOpen"
      @close="modalOpen = false"
      @saved="accountsQuery.refetch()"
    />
  </div>
</template>
