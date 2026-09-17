<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Plus } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import PermissionGate from '@/components/common/PermissionGate.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import TaxRateFormModal from '@/features/finance/components/TaxRateFormModal.vue'
import TaxTransactionFormModal from '@/features/finance/components/TaxTransactionFormModal.vue'
import {
  useFinanceTaxTransactionsQuery,
  useFinanceTaxTypesQuery,
} from '@/features/finance/api/tax.queries'
import { formatFinanceAmount } from '@/features/finance/utils/format'

const typesQuery = useFinanceTaxTypesQuery()

const filters = reactive({ tax_type_id: '', start_date: '', end_date: '' })
const listParams = computed(() => ({
  tax_type_id: filters.tax_type_id || undefined,
  start_date: filters.start_date || undefined,
  end_date: filters.end_date || undefined,
  per_page: 50,
}))
const transactionsQuery = useFinanceTaxTransactionsQuery(listParams)

const rateModalOpen = ref(false)
const transactionModalOpen = ref(false)

const directionLabels: Record<string, string> = {
  increase: 'Bertambah',
  decrease: 'Berkurang',
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Transaksi Pajak"
      description="Pencatatan PPN, PPh 21/23, dan PPh Badan untuk keperluan pelaporan pajak."
    >
      <PermissionGate permission="platform.finance.tax.manage">
        <div class="flex gap-2">
          <BaseButton variant="secondary" @click="rateModalOpen = true">
            <Plus class="size-4" /> Tarif
          </BaseButton>
          <BaseButton @click="transactionModalOpen = true">
            <Plus class="size-4" /> Transaksi Baru
          </BaseButton>
        </div>
      </PermissionGate>
    </PageHeader>

    <BaseCard>
      <div class="mb-3 flex flex-wrap items-end gap-3">
        <label class="text-sm font-medium">
          Jenis Pajak
          <select
            v-model="filters.tax_type_id"
            class="mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          >
            <option value="">Semua</option>
            <option v-for="t in typesQuery.data.value ?? []" :key="t.id" :value="t.id">
              {{ t.code }} — {{ t.name }}
            </option>
          </select>
        </label>
        <label class="text-sm font-medium">
          Dari
          <input
            v-model="filters.start_date"
            type="date"
            class="mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
        <label class="text-sm font-medium">
          Sampai
          <input
            v-model="filters.end_date"
            type="date"
            class="mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
      </div>

      <table class="w-full text-sm">
        <thead>
          <tr
            class="border-b text-left text-xs font-medium uppercase text-gray-500 dark:border-gray-800"
          >
            <th class="px-3 py-2">Tanggal</th>
            <th class="px-3 py-2">Jenis</th>
            <th class="px-3 py-2">Arah</th>
            <th class="px-3 py-2">Akun Pajak</th>
            <th class="px-3 py-2">Referensi</th>
            <th class="px-3 py-2 text-right">Nominal</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="t in transactionsQuery.data.value?.data ?? []"
            :key="t.id"
            class="border-b last:border-0 dark:border-gray-800"
          >
            <td class="px-3 py-2">{{ t.transaction_date }}</td>
            <td class="px-3 py-2">{{ t.tax_type_code }}</td>
            <td class="px-3 py-2">
              <span
                class="rounded-full px-2 py-0.5 text-xs"
                :class="
                  t.direction === 'increase'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                "
              >
                {{ directionLabels[t.direction] }}
              </span>
            </td>
            <td class="px-3 py-2 text-gray-500">
              {{ t.tax_account_code }} — {{ t.tax_account_name }}
            </td>
            <td class="px-3 py-2 text-gray-500">{{ t.reference_number }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ formatFinanceAmount(t.amount) }}</td>
          </tr>
        </tbody>
      </table>
    </BaseCard>

    <TaxRateFormModal :open="rateModalOpen" @close="rateModalOpen = false" @created="() => {}" />
    <TaxTransactionFormModal
      :open="transactionModalOpen"
      @close="transactionModalOpen = false"
      @created="transactionsQuery.refetch()"
    />
  </div>
</template>
