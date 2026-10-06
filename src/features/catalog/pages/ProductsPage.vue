<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Package, Pencil, Plus, Tags, Trash2 } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

import type { CatalogProduct, ProductListParams } from '@/features/catalog/api/catalog.api'
import {
  useCategoriesQuery,
  useDeleteProductMutation,
  useProductsQuery,
} from '@/features/catalog/api/catalog.queries'
import CategoryManagerDialog from '@/features/catalog/components/CategoryManagerDialog.vue'
import ProductFormDrawer from '@/features/catalog/components/ProductFormDrawer.vue'
import { catalogErrorMessage } from '@/features/catalog/utils/errors'
import {
  normalizePricing,
  priceSuffix,
  pricingShort,
  type PricingAttrs,
} from '@/features/catalog/utils/pricing'

const PER_PAGE = 20

const props = withDefaults(defineProps<{ mode?: 'platform' | 'workspace' }>(), {
  mode: 'workspace',
})

const auth = useAuthStore()
const canCreate = computed(() => auth.can('catalog_product.create'))
const canUpdate = computed(() => auth.can('catalog_product.update'))
const canDelete = computed(() => auth.can('catalog_product.delete'))

const searchInput = ref('')
const search = ref('')
const categoryFilter = ref('')
const statusFilter = ref<'all' | 'active' | 'inactive'>('all')
const page = ref(1)

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(searchInput, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    search.value = value.trim()
  }, 300)
})
onBeforeUnmount(() => clearTimeout(searchTimer))

watch([search, categoryFilter, statusFilter], () => {
  page.value = 1
})

const params = computed<ProductListParams>(() => ({
  page: page.value,
  per_page: PER_PAGE,
  q: search.value || undefined,
  category_id: categoryFilter.value || undefined,
  is_active: statusFilter.value === 'all' ? undefined : statusFilter.value === 'active',
}))

const productsQuery = useProductsQuery(params)
const categoriesQuery = useCategoriesQuery()
const products = computed(() => productsQuery.data.value?.data ?? [])
const total = computed(() => productsQuery.data.value?.meta?.total ?? 0)
const categories = computed(() => categoriesQuery.data.value ?? [])
const hasFilter = computed(
  () => Boolean(search.value || categoryFilter.value) || statusFilter.value !== 'all',
)
const lastPage = computed(() => Math.max(1, Math.ceil(total.value / PER_PAGE)))

const deleteMutation = useDeleteProductMutation()
const actionError = ref('')

const formOpen = ref(false)
const editing = ref<CatalogProduct | null>(null)
const categoryDialogOpen = ref(false)

function openCreate() {
  editing.value = null
  formOpen.value = true
}

function openEdit(product: CatalogProduct) {
  editing.value = product
  formOpen.value = true
}

async function handleDelete(product: CatalogProduct) {
  if (!confirm(`Hapus produk "${product.name}"? Quotation yang sudah ada tidak berubah.`)) return
  actionError.value = ''
  try {
    await deleteMutation.mutateAsync(product.id)
  } catch (error) {
    actionError.value = catalogErrorMessage(error)
  }
}

// Produk lama/respons tanpa atribut dianggap Sekali bayar · Prabayar.
function pricingOf(product: CatalogProduct): PricingAttrs {
  return normalizePricing(product)
}

function formatTax(value: string) {
  return `${Number(value)}%`
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Produk" description="Katalog produk & layanan untuk penawaran.">
      <div class="flex gap-2">
        <BaseButton v-if="canUpdate" variant="outline" @click="categoryDialogOpen = true">
          <Tags class="size-4" />
          Kategori
        </BaseButton>
        <BaseButton v-if="canCreate" @click="openCreate">
          <Plus class="size-4" />
          Tambah produk
        </BaseButton>
      </div>
    </PageHeader>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <input
        v-model="searchInput"
        name="product-search"
        type="search"
        placeholder="Cari nama atau SKU"
        aria-label="Cari produk"
        class="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 sm:max-w-xs dark:bg-gray-950"
      />
      <select
        v-model="categoryFilter"
        name="product-category"
        aria-label="Filter kategori"
        class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
      >
        <option value="">Semua kategori</option>
        <option v-for="category in categories" :key="category.id" :value="category.id">
          {{ category.name }}
        </option>
      </select>
      <select
        v-model="statusFilter"
        name="product-status"
        aria-label="Filter status"
        class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
      >
        <option value="all">Semua status</option>
        <option value="active">Aktif</option>
        <option value="inactive">Nonaktif</option>
      </select>
    </div>

    <p v-if="actionError" class="text-sm text-red-600">{{ actionError }}</p>

    <BaseCard class="!p-0">
      <div v-if="productsQuery.isPending.value" class="p-12 text-center text-sm text-gray-500">
        Memuat data...
      </div>
      <div v-else-if="productsQuery.isError.value" class="p-12 text-center text-sm text-red-600">
        Gagal memuat produk. Muat ulang halaman untuk mencoba lagi.
      </div>
      <div v-else-if="products.length === 0" class="p-12 text-center text-sm text-gray-500">
        <Package class="mx-auto mb-3 size-8 text-gray-300" />
        <template v-if="hasFilter">Tidak ada produk yang cocok dengan filter.</template>
        <template v-else>
          <p>Belum ada produk. Tambahkan produk pertama untuk dipakai di penawaran.</p>
          <BaseButton v-if="canCreate" class="mt-4" @click="openCreate">
            <Plus class="size-4" />
            Tambah produk
          </BaseButton>
        </template>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900">
            <tr>
              <th class="px-5 py-3">SKU</th>
              <th class="px-5 py-3">Nama</th>
              <th class="px-5 py-3">Kategori</th>
              <th class="px-5 py-3">Satuan</th>
              <th class="px-5 py-3 text-right">Harga</th>
              <th class="px-5 py-3 text-right">Pajak</th>
              <th class="px-5 py-3">Status</th>
              <th v-if="canUpdate || canDelete" class="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in products" :key="product.id" class="border-b last:border-0">
              <td class="px-5 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                {{ product.sku || '—' }}
              </td>
              <td class="px-5 py-3">
                <p class="font-medium">
                  {{ product.name }}
                  <span
                    v-if="product.is_public"
                    class="ml-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                  >
                    Publik
                  </span>
                </p>
                <p v-if="product.description" class="line-clamp-1 text-xs text-gray-500">
                  {{ product.description }}
                </p>
              </td>
              <td class="px-5 py-3">{{ product.category_name || '—' }}</td>
              <td class="px-5 py-3">{{ product.unit }}</td>
              <td class="px-5 py-3 text-right tabular-nums">
                {{ formatCurrency(Number(product.base_price), product.currency)
                }}{{ priceSuffix(pricingOf(product)) }}
                <p class="text-xs font-normal text-gray-500">
                  {{ pricingShort(pricingOf(product)) }}
                </p>
              </td>
              <td class="px-5 py-3 text-right tabular-nums">
                {{ formatTax(product.tax_percent) }}
              </td>
              <td class="px-5 py-3">
                <span
                  class="rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="
                    product.is_active
                      ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                  "
                >
                  {{ product.is_active ? 'Aktif' : 'Nonaktif' }}
                </span>
              </td>
              <td v-if="canUpdate || canDelete" class="px-5 py-3">
                <div class="flex justify-end gap-2">
                  <BaseButton
                    v-if="canUpdate"
                    variant="outline"
                    :aria-label="`Ubah ${product.name}`"
                    @click="openEdit(product)"
                  >
                    <Pencil class="size-4" />
                  </BaseButton>
                  <BaseButton
                    v-if="canDelete"
                    variant="danger"
                    :aria-label="`Hapus ${product.name}`"
                    @click="handleDelete(product)"
                  >
                    <Trash2 class="size-4" />
                  </BaseButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <div v-if="total > PER_PAGE" class="flex items-center justify-end gap-3 text-sm">
      <span class="text-gray-500">Halaman {{ page }} dari {{ lastPage }}</span>
      <BaseButton variant="outline" :disabled="page <= 1" @click="page--">Sebelumnya</BaseButton>
      <BaseButton variant="outline" :disabled="page >= lastPage" @click="page++">
        Berikutnya
      </BaseButton>
    </div>

    <ProductFormDrawer
      :open="formOpen"
      :product="editing"
      :categories="categories"
      :mode="props.mode"
      @close="formOpen = false"
      @saved="formOpen = false"
    />
    <CategoryManagerDialog
      :open="categoryDialogOpen"
      :categories="categories"
      @close="categoryDialogOpen = false"
    />
  </div>
</template>
