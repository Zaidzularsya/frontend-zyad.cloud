<script setup lang="ts">
import { ref } from 'vue'
import { Lock, LockOpen, Plus } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import PermissionGate from '@/components/common/PermissionGate.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import {
  useCloseFinanceFiscalPeriodMutation,
  useCloseFinanceFiscalYearMutation,
  useCreateFinanceFiscalYearMutation,
  useFinanceFiscalYearsQuery,
  useReopenFinanceFiscalPeriodMutation,
  useReopenFinanceFiscalYearMutation,
} from '@/features/finance/api/coa.queries'

const yearsQuery = useFinanceFiscalYearsQuery()
const createYearMutation = useCreateFinanceFiscalYearMutation()
const closeYearMutation = useCloseFinanceFiscalYearMutation()
const reopenYearMutation = useReopenFinanceFiscalYearMutation()
const closePeriodMutation = useCloseFinanceFiscalPeriodMutation()
const reopenPeriodMutation = useReopenFinanceFiscalPeriodMutation()

const newYear = ref(new Date().getFullYear())
const errorMessage = ref('')
const expandedYearId = ref<string | null>(null)

async function createYear() {
  errorMessage.value = ''
  try {
    await createYearMutation.mutateAsync(newYear.value)
  } catch (error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    errorMessage.value = response?.data?.message ?? 'Gagal membuat tahun buku.'
  }
}

function toggleYear(id: string) {
  expandedYearId.value = expandedYearId.value === id ? null : id
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Tahun & Periode Buku"
      description="Kelola tahun buku dan kunci periode setelah pembukuan difinalisasi."
    />

    <PermissionGate permission="platform.finance.coa.manage">
      <BaseCard>
        <form class="flex items-end gap-3" @submit.prevent="createYear">
          <label class="text-sm font-medium">
            Tahun Buku Baru
            <input
              v-model.number="newYear"
              type="number"
              class="mt-1 w-32 rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
            />
          </label>
          <BaseButton type="submit" :disabled="createYearMutation.isPending.value">
            <Plus class="size-4" /> Buat Tahun Buku
          </BaseButton>
        </form>
        <p v-if="errorMessage" class="mt-2 text-sm text-red-600">{{ errorMessage }}</p>
      </BaseCard>
    </PermissionGate>

    <BaseCard v-for="year in yearsQuery.data.value ?? []" :key="year.id">
      <div class="flex items-center justify-between">
        <button class="text-left" @click="toggleYear(year.id)">
          <h3 class="font-semibold text-gray-900 dark:text-gray-100">
            Tahun Buku {{ year.year }}
            <span
              class="ml-2 rounded-full px-2 py-0.5 text-xs"
              :class="
                year.status === 'open'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
              "
            >
              {{ year.status === 'open' ? 'Terbuka' : 'Ditutup' }}
            </span>
          </h3>
          <p class="text-sm text-gray-500">{{ year.start_date }} s.d. {{ year.end_date }}</p>
        </button>
        <PermissionGate permission="platform.finance.coa.manage">
          <BaseButton
            v-if="year.status === 'open'"
            variant="outline"
            @click="closeYearMutation.mutate(year.id)"
          >
            <Lock class="size-4" /> Tutup Tahun
          </BaseButton>
          <BaseButton v-else variant="outline" @click="reopenYearMutation.mutate(year.id)">
            <LockOpen class="size-4" /> Buka Kembali
          </BaseButton>
        </PermissionGate>
      </div>

      <table v-if="expandedYearId === year.id" class="mt-4 w-full text-sm">
        <thead>
          <tr
            class="border-b text-left text-xs font-medium uppercase text-gray-500 dark:border-gray-800"
          >
            <th class="px-3 py-2">Periode</th>
            <th class="px-3 py-2">Rentang Tanggal</th>
            <th class="px-3 py-2">Status</th>
            <th class="px-3 py-2 text-right"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="period in year.periods ?? []"
            :key="period.id"
            class="border-b last:border-0 dark:border-gray-800"
          >
            <td class="px-3 py-2">Periode {{ period.period_number }}</td>
            <td class="px-3 py-2 text-gray-500">
              {{ period.start_date }} s.d. {{ period.end_date }}
            </td>
            <td class="px-3 py-2">
              {{ period.status === 'open' ? 'Terbuka' : 'Ditutup' }}
            </td>
            <td class="px-3 py-2 text-right">
              <PermissionGate permission="platform.finance.coa.manage">
                <button
                  v-if="period.status === 'open'"
                  class="text-gray-400 hover:text-amber-600"
                  title="Tutup periode"
                  @click="closePeriodMutation.mutate(period.id)"
                >
                  <Lock class="size-4" />
                </button>
                <button
                  v-else
                  class="text-gray-400 hover:text-emerald-600"
                  title="Buka kembali periode"
                  @click="reopenPeriodMutation.mutate(period.id)"
                >
                  <LockOpen class="size-4" />
                </button>
              </PermissionGate>
            </td>
          </tr>
        </tbody>
      </table>
    </BaseCard>
  </div>
</template>
