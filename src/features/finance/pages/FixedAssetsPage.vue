<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import PageHeader from '@/components/common/PageHeader.vue'
import PermissionGate from '@/components/common/PermissionGate.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import AssetCategoryFormModal from '@/features/finance/components/AssetCategoryFormModal.vue'
import FixedAssetFormModal from '@/features/finance/components/FixedAssetFormModal.vue'
import {
  useFinanceAssetCategoriesQuery,
  useFinanceFixedAssetsQuery,
  usePostFinanceDepreciationMutation,
} from '@/features/finance/api/fixed-assets.queries'
import { formatFinanceAmount } from '@/features/finance/utils/format'

const router = useRouter()

const categoriesQuery = useFinanceAssetCategoriesQuery(computed(() => ({})))

const filters = reactive({
  asset_category_id: '',
  status: '' as '' | 'active' | 'fully_depreciated',
})
const listParams = computed(() => ({
  asset_category_id: filters.asset_category_id || undefined,
  status: filters.status || undefined,
  per_page: 50,
}))
const assetsQuery = useFinanceFixedAssetsQuery(listParams)

const categoryModalOpen = ref(false)
const assetModalOpen = ref(false)

const postDepreciationDate = ref(new Date().toISOString().slice(0, 10))
const postMutation = usePostFinanceDepreciationMutation()
const postResultMessage = ref('')

async function runPostDepreciation() {
  postResultMessage.value = ''
  const result = await postMutation.mutateAsync({ as_of_date: postDepreciationDate.value })
  postResultMessage.value = `Diposting ${result.posted_count} baris, gagal ${result.failed_count} baris.`
  assetsQuery.refetch()
}

function openDetail(id: string) {
  router.push({ name: 'platform-finance-fixed-asset-detail', params: { id } })
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Aset Tetap"
      description="Daftar aset tetap, akumulasi penyusutan, dan nilai buku berjalan."
    >
      <PermissionGate permission="platform.finance.asset.manage">
        <div class="flex gap-2">
          <BaseButton variant="secondary" @click="categoryModalOpen = true">
            <Plus class="size-4" /> Kategori
          </BaseButton>
          <BaseButton @click="assetModalOpen = true">
            <Plus class="size-4" /> Aset Baru
          </BaseButton>
        </div>
      </PermissionGate>
    </PageHeader>

    <BaseCard>
      <div class="mb-3 flex flex-wrap items-end gap-3">
        <label class="text-sm font-medium">
          Kategori
          <select
            v-model="filters.asset_category_id"
            class="mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          >
            <option value="">Semua</option>
            <option v-for="cat in categoriesQuery.data.value ?? []" :key="cat.id" :value="cat.id">
              {{ cat.code }} — {{ cat.name }}
            </option>
          </select>
        </label>
        <label class="text-sm font-medium">
          Status
          <select
            v-model="filters.status"
            class="mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          >
            <option value="">Semua</option>
            <option value="active">Aktif</option>
            <option value="fully_depreciated">Penyusutan Penuh</option>
          </select>
        </label>
      </div>

      <table class="w-full text-sm">
        <thead>
          <tr
            class="border-b text-left text-xs font-medium uppercase text-gray-500 dark:border-gray-800"
          >
            <th class="px-3 py-2">Kode</th>
            <th class="px-3 py-2">Nama</th>
            <th class="px-3 py-2">Kategori</th>
            <th class="px-3 py-2 text-right">Harga Perolehan</th>
            <th class="px-3 py-2 text-right">Akum. Penyusutan</th>
            <th class="px-3 py-2 text-right">Nilai Buku</th>
            <th class="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="asset in assetsQuery.data.value?.data ?? []"
            :key="asset.id"
            class="cursor-pointer border-b last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
            @click="openDetail(asset.id)"
          >
            <td class="px-3 py-2">{{ asset.asset_code }}</td>
            <td class="px-3 py-2">{{ asset.asset_name }}</td>
            <td class="px-3 py-2 text-gray-500">{{ asset.asset_category_name }}</td>
            <td class="px-3 py-2 text-right tabular-nums">
              {{ formatFinanceAmount(asset.acquisition_cost) }}
            </td>
            <td class="px-3 py-2 text-right tabular-nums">
              {{ formatFinanceAmount(asset.accumulated_depreciation) }}
            </td>
            <td class="px-3 py-2 text-right tabular-nums">
              {{ formatFinanceAmount(asset.book_value) }}
            </td>
            <td class="px-3 py-2">
              <span
                class="rounded-full px-2 py-0.5 text-xs"
                :class="
                  asset.status === 'active'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                "
              >
                {{ asset.status === 'active' ? 'Aktif' : 'Penyusutan Penuh' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </BaseCard>

    <PermissionGate permission="platform.finance.asset.manage">
      <BaseCard>
        <h3 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
          Posting Penyusutan
        </h3>
        <p class="mb-3 text-sm text-gray-500">
          Posting semua jadwal penyusutan yang jatuh pada atau sebelum tanggal ini, untuk seluruh
          aset.
        </p>
        <div class="flex flex-wrap items-end gap-3">
          <label class="text-sm font-medium">
            Sampai Tanggal
            <input
              v-model="postDepreciationDate"
              type="date"
              class="mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
            />
          </label>
          <BaseButton :disabled="postMutation.isPending.value" @click="runPostDepreciation">
            Posting Penyusutan
          </BaseButton>
        </div>
        <p v-if="postResultMessage" class="mt-3 text-sm text-gray-600 dark:text-gray-300">
          {{ postResultMessage }}
        </p>
      </BaseCard>
    </PermissionGate>

    <AssetCategoryFormModal
      :open="categoryModalOpen"
      @close="categoryModalOpen = false"
      @created="categoriesQuery.refetch()"
    />
    <FixedAssetFormModal
      :open="assetModalOpen"
      @close="assetModalOpen = false"
      @created="assetsQuery.refetch()"
    />
  </div>
</template>
