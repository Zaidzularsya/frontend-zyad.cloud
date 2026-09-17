<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import {
  useFinanceDepreciationScheduleQuery,
  useFinanceFixedAssetsQuery,
} from '@/features/finance/api/fixed-assets.queries'
import { formatFinanceAmount } from '@/features/finance/utils/format'

const route = useRoute()
const router = useRouter()
const assetId = computed(() => String(route.params.id))

const assetsQuery = useFinanceFixedAssetsQuery(computed(() => ({ per_page: 200 })))
const asset = computed(() =>
  (assetsQuery.data.value?.data ?? []).find((a) => a.id === assetId.value),
)

const scheduleQuery = useFinanceDepreciationScheduleQuery(assetId)

const statusLabels: Record<string, string> = {
  pending: 'Belum Diposting',
  posted: 'Sudah Diposting',
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      :title="asset ? `${asset.asset_code} — ${asset.asset_name}` : 'Detail Aset Tetap'"
      description="Jadwal penyusutan garis lurus bulanan."
    >
      <BaseButton variant="secondary" @click="router.back()">
        <ArrowLeft class="size-4" /> Kembali
      </BaseButton>
    </PageHeader>

    <BaseCard v-if="asset">
      <dl class="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt class="text-gray-500">Tanggal Perolehan</dt>
          <dd class="font-medium">{{ asset.acquisition_date }}</dd>
        </div>
        <div>
          <dt class="text-gray-500">Harga Perolehan</dt>
          <dd class="font-medium tabular-nums">
            {{ formatFinanceAmount(asset.acquisition_cost) }}
          </dd>
        </div>
        <div>
          <dt class="text-gray-500">Umur Ekonomis</dt>
          <dd class="font-medium">{{ asset.useful_life_months }} bulan</dd>
        </div>
        <div>
          <dt class="text-gray-500">Nilai Buku</dt>
          <dd class="font-medium tabular-nums">{{ formatFinanceAmount(asset.book_value) }}</dd>
        </div>
      </dl>
    </BaseCard>

    <BaseCard>
      <h3 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Jadwal Penyusutan</h3>
      <table class="w-full text-sm">
        <thead>
          <tr
            class="border-b text-left text-xs font-medium uppercase text-gray-500 dark:border-gray-800"
          >
            <th class="px-3 py-2">#</th>
            <th class="px-3 py-2">Periode</th>
            <th class="px-3 py-2 text-right">Nominal</th>
            <th class="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in scheduleQuery.data.value ?? []"
            :key="row.id"
            class="border-b last:border-0 dark:border-gray-800"
          >
            <td class="px-3 py-2">{{ row.sequence_number }}</td>
            <td class="px-3 py-2">{{ row.period_date }}</td>
            <td class="px-3 py-2 text-right tabular-nums">
              {{ formatFinanceAmount(row.depreciation_amount) }}
            </td>
            <td class="px-3 py-2">
              <span
                class="rounded-full px-2 py-0.5 text-xs"
                :class="
                  row.status === 'posted'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                "
              >
                {{ statusLabels[row.status] }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </BaseCard>
  </div>
</template>
