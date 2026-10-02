<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import BaseModal from '@/components/ui/BaseModal.vue'
import type { CatalogProduct } from '@/features/catalog/api/catalog.api'
import { useProductsQuery } from '@/features/catalog/api/catalog.queries'
import { formatRupiah } from '@/features/crm/quotations/utils/quotation-editor'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'pick', product: CatalogProduct): void
}>()

const route = useRoute()
const productsPath = computed(() => route.path.replace(/quotations\/[^/]+$/, 'products'))

const searchInput = ref('')
const search = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
watch(searchInput, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    search.value = value.trim()
  }, 300)
})
onBeforeUnmount(() => clearTimeout(timer))
watch(
  () => props.open,
  (open) => {
    if (open) {
      searchInput.value = ''
      search.value = ''
    }
  },
)

const params = computed(() => ({
  page: 1,
  per_page: 20,
  q: search.value || undefined,
  is_active: true,
}))
const productsQuery = useProductsQuery(params)
const products = computed(() => productsQuery.data.value?.data ?? [])
</script>

<template>
  <BaseModal :open="open" title="Tambah produk" @close="emit('close')">
    <div class="space-y-3">
      <input
        v-model="searchInput"
        name="product-search"
        type="search"
        placeholder="Cari nama atau SKU"
        aria-label="Cari produk"
        class="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
      />
      <p v-if="productsQuery.isPending.value" class="py-6 text-center text-sm text-gray-500">
        Memuat produk...
      </p>
      <p v-else-if="products.length === 0" class="py-6 text-center text-sm text-gray-500">
        Produk tidak ditemukan.
        <RouterLink :to="productsPath" class="font-medium text-brand-600"
          >Tambahkan di menu Produk.</RouterLink
        >
      </p>
      <ul v-else class="max-h-80 divide-y overflow-y-auto rounded-lg border">
        <li v-for="product in products" :key="product.id">
          <button
            type="button"
            class="flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none dark:hover:bg-gray-800"
            @click="emit('pick', product)"
          >
            <span>
              <span class="block font-medium">{{ product.name }}</span>
              <span class="block text-xs text-gray-500">
                {{ product.sku || 'Tanpa SKU' }} · {{ product.unit }} · pajak
                {{ Number(product.tax_percent) }}%
              </span>
            </span>
            <span class="whitespace-nowrap tabular-nums">{{
              formatRupiah(product.base_price)
            }}</span>
          </button>
        </li>
      </ul>
    </div>
  </BaseModal>
</template>
