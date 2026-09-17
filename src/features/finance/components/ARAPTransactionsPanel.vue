<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Plus } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import PermissionGate from '@/components/common/PermissionGate.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import ARAPTransactionFormModal from '@/features/finance/components/ARAPTransactionFormModal.vue'
import ARAPPaymentFormModal from '@/features/finance/components/ARAPPaymentFormModal.vue'
import {
  useFinanceAgingReportQuery,
  useFinanceARAPTransactionsQuery,
} from '@/features/finance/api/ar-ap.queries'
import { formatFinanceAmount } from '@/features/finance/utils/format'
import type {
  FinanceARAPTransaction,
  FinanceARAPTransactionType,
} from '@/features/finance/api/ar-ap.api'

const props = defineProps<{
  transactionType: FinanceARAPTransactionType
  title: string
  description: string
  createButtonLabel: string
}>()

const statusLabels: Record<string, string> = {
  open: 'Terbuka',
  partially_paid: 'Sebagian Dibayar',
  paid: 'Lunas',
  void: 'Dibatalkan',
}

const filters = reactive({ status: '' as '' | FinanceARAPTransaction['status'] })
const listParams = computed(() => ({
  transaction_type: props.transactionType,
  status: filters.status || undefined,
  per_page: 50,
}))
const transactionsQuery = useFinanceARAPTransactionsQuery(listParams)

const agingParams = computed(() => ({
  transaction_type: props.transactionType,
  as_of_date: new Date().toISOString().slice(0, 10),
}))
const agingQuery = useFinanceAgingReportQuery(agingParams)

const createModalOpen = ref(false)
const paymentModalOpen = ref(false)
const paymentTarget = ref<FinanceARAPTransaction | null>(null)

function openPayment(transaction: FinanceARAPTransaction) {
  paymentTarget.value = transaction
  paymentModalOpen.value = true
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="title" :description="description">
      <PermissionGate permission="platform.finance.arap.manage">
        <BaseButton @click="createModalOpen = true">
          <Plus class="size-4" /> {{ createButtonLabel }}
        </BaseButton>
      </PermissionGate>
    </PageHeader>

    <BaseCard>
      <div class="mb-3 flex flex-wrap items-end gap-3">
        <label class="text-sm font-medium">
          Status
          <select
            v-model="filters.status"
            class="mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          >
            <option value="">Semua</option>
            <option value="open">Terbuka</option>
            <option value="partially_paid">Sebagian Dibayar</option>
            <option value="paid">Lunas</option>
            <option value="void">Dibatalkan</option>
          </select>
        </label>
      </div>

      <table class="w-full text-sm">
        <thead>
          <tr
            class="border-b text-left text-xs font-medium uppercase text-gray-500 dark:border-gray-800"
          >
            <th class="px-3 py-2">Mitra</th>
            <th class="px-3 py-2">Tanggal</th>
            <th class="px-3 py-2">Jatuh Tempo</th>
            <th class="px-3 py-2 text-right">Nominal</th>
            <th class="px-3 py-2 text-right">Outstanding</th>
            <th class="px-3 py-2">Status</th>
            <th class="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="t in transactionsQuery.data.value?.data ?? []"
            :key="t.id"
            class="border-b last:border-0 dark:border-gray-800"
          >
            <td class="px-3 py-2">{{ t.partner_code }} — {{ t.partner_name }}</td>
            <td class="px-3 py-2">{{ t.transaction_date }}</td>
            <td class="px-3 py-2">{{ t.due_date }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ formatFinanceAmount(t.amount) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">
              {{ formatFinanceAmount(t.outstanding_amount) }}
            </td>
            <td class="px-3 py-2">
              <span
                class="rounded-full px-2 py-0.5 text-xs"
                :class="{
                  'bg-gray-100 text-gray-600 dark:bg-gray-800': t.status === 'open',
                  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300':
                    t.status === 'partially_paid',
                  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300':
                    t.status === 'paid',
                  'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300':
                    t.status === 'void',
                }"
              >
                {{ statusLabels[t.status] }}
              </span>
            </td>
            <td class="px-3 py-2 text-right">
              <PermissionGate permission="platform.finance.arap.manage">
                <button
                  v-if="t.status === 'open' || t.status === 'partially_paid'"
                  class="text-xs font-medium text-brand-600 hover:underline"
                  @click="openPayment(t)"
                >
                  Bayar
                </button>
              </PermissionGate>
            </td>
          </tr>
        </tbody>
      </table>
    </BaseCard>

    <BaseCard>
      <h3 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Aging Report</h3>
      <table class="w-full text-sm">
        <thead>
          <tr
            class="border-b text-left text-xs font-medium uppercase text-gray-500 dark:border-gray-800"
          >
            <th class="px-3 py-2">Mitra</th>
            <th
              v-for="bucket in agingQuery.data.value?.rows[0]?.buckets ?? []"
              :key="bucket.label"
              class="px-3 py-2 text-right"
            >
              {{ bucket.label }}
            </th>
            <th class="px-3 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in agingQuery.data.value?.rows ?? []"
            :key="row.partner_id"
            class="border-b last:border-0 dark:border-gray-800"
          >
            <td class="px-3 py-2">{{ row.partner_code }} — {{ row.partner_name }}</td>
            <td
              v-for="bucket in row.buckets"
              :key="bucket.label"
              class="px-3 py-2 text-right tabular-nums"
            >
              {{ formatFinanceAmount(bucket.amount) }}
            </td>
            <td class="px-3 py-2 text-right font-medium tabular-nums">
              {{ formatFinanceAmount(row.total) }}
            </td>
          </tr>
        </tbody>
        <tfoot v-if="agingQuery.data.value">
          <tr class="border-t font-medium dark:border-gray-800">
            <td
              class="px-3 py-2"
              :colspan="(agingQuery.data.value.rows[0]?.buckets.length ?? 0) + 1"
            >
              Grand Total
            </td>
            <td class="px-3 py-2 text-right tabular-nums">
              {{ formatFinanceAmount(agingQuery.data.value.grand_total) }}
            </td>
          </tr>
        </tfoot>
      </table>
    </BaseCard>

    <ARAPTransactionFormModal
      :open="createModalOpen"
      :transaction-type="transactionType"
      @close="createModalOpen = false"
      @created="transactionsQuery.refetch()"
    />
    <ARAPPaymentFormModal
      :open="paymentModalOpen"
      :transaction="paymentTarget"
      @close="paymentModalOpen = false"
      @created="
        () => {
          transactionsQuery.refetch()
          agingQuery.refetch()
        }
      "
    />
  </div>
</template>
