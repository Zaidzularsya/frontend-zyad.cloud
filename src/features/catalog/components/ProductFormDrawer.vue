<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useAuthStore } from '@/stores/auth.store'

import type { CatalogCategory, CatalogProduct } from '@/features/catalog/api/catalog.api'
import {
  useCatalogFeaturesQuery,
  useSaveProductMutation,
} from '@/features/catalog/api/catalog.queries'
import ProductEntitlementTable from '@/features/catalog/components/ProductEntitlementTable.vue'
import ProductPublishingSection from '@/features/catalog/components/ProductPublishingSection.vue'
import { catalogErrorMessage, errorCode } from '@/features/catalog/utils/errors'
import {
  buildProductPayload,
  validateFeatures,
  emptyProductForm,
  productToForm,
  validateProductForm,
  type ProductForm,
} from '@/features/catalog/utils/product-form'

const props = defineProps<{
  open: boolean
  product: CatalogProduct | null
  categories: CatalogCategory[]
  // 'platform' = katalog org platform: bagian Publikasi & Fitur ditampilkan.
  mode?: 'platform' | 'workspace'
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

import { FREQUENCIES } from '@/features/catalog/utils/pricing'

const UNITS = ['pcs', 'unit', 'paket', 'bulan', 'tahun', 'jam', 'hari', 'meter']

const form = ref<ProductForm>(emptyProductForm())
const errorMessage = ref('')
const saveMutation = useSaveProductMutation()
const isPlatform = computed(() => props.mode === 'platform')
const auth = useAuthStore()
// Org non-platform hanya boleh mengatur entitlement bila punya izin khusus (backend 403 tanpa izin).
const canTenantEntitlements = computed(
  () => props.mode === 'workspace' && auth.can('catalog_product.manage_entitlements'),
)
const entitlementsEnabled = computed(() => isPlatform.value || canTenantEntitlements.value)
const featuresQuery = useCatalogFeaturesQuery(entitlementsEnabled)
// Tabel tenant hanya mendukung boolean/integer; decimal/string tidak ditawarkan.
const featureDefs = computed(() => {
  const defs = featuresQuery.data.value ?? []
  return canTenantEntitlements.value
    ? defs.filter((d) => d.value_type === 'boolean' || d.value_type === 'integer')
    : defs
})
const maxByKey = computed(() => {
  const map: Record<string, number> = {}
  for (const d of featureDefs.value) if (d.tenant_max !== undefined) map[d.key] = d.tenant_max
  return map
})
const advancedOpen = ref(false)
const listingError = ref('')

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.value = props.product
      ? productToForm(props.product, featureDefs.value)
      : emptyProductForm()
    errorMessage.value = ''
    listingError.value = ''
    advancedOpen.value = Boolean(props.product?.needs_update) && canTenantEntitlements.value
  },
)

// Registry fitur bisa tiba setelah drawer dibuka; baris yang sudah dimuat perlu nilai bertipe.
watch(featureDefs, (defs) => {
  if (props.open && props.product && entitlementsEnabled.value)
    form.value = productToForm(props.product, defs)
})

async function submit() {
  const platformOpts = {
    platform: isPlatform.value,
    // Tanpa defs yang berhasil dimuat, features tidak dikirim (data stale bisa menimpa/403).
    entitlements: canTenantEntitlements.value && featuresQuery.isSuccess.value,
    featureDefs: featureDefs.value,
    maxByKey: maxByKey.value,
  }
  const invalid = validateProductForm(form.value, platformOpts)
  if (invalid) {
    // Jangan sembunyikan error fitur di balik collapse yang tertutup.
    if (
      platformOpts.entitlements &&
      validateFeatures(form.value, featureDefs.value, maxByKey.value)
    )
      advancedOpen.value = true
    errorMessage.value = invalid
    return
  }
  errorMessage.value = ''
  listingError.value = ''
  try {
    await saveMutation.mutateAsync({
      id: props.product?.id,
      payload: buildProductPayload(form.value, {
        editing: Boolean(props.product),
        ...platformOpts,
      }),
    })
    emit('saved')
  } catch (error) {
    const message = catalogErrorMessage(error)
    if (errorCode(error) === 'PRODUCT_LISTING_EXISTS') listingError.value = message
    else errorMessage.value = message
  }
}

const inputClass =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950'
</script>

<template>
  <BaseModal :open="open" :title="product ? 'Ubah produk' : 'Tambah produk'" @close="emit('close')">
    <form class="space-y-4" @submit.prevent="submit">
      <label class="block space-y-1 text-sm">
        <span class="font-medium">Nama <span class="text-red-600">*</span></span>
        <input v-model="form.name" name="name" :class="inputClass" maxlength="200" required />
      </label>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block space-y-1 text-sm">
          <span class="font-medium">SKU</span>
          <input v-model="form.sku" name="sku" :class="inputClass" maxlength="64" />
        </label>
        <label class="block space-y-1 text-sm">
          <span class="font-medium">Kategori</span>
          <select v-model="form.categoryId" name="category" :class="inputClass">
            <option value="">Tanpa kategori</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
        </label>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <label class="block space-y-1 text-sm">
          <span class="font-medium">Satuan</span>
          <input
            v-model="form.unit"
            name="unit"
            list="catalog-units"
            :class="inputClass"
            maxlength="30"
          />
          <datalist id="catalog-units">
            <option v-for="unit in UNITS" :key="unit" :value="unit" />
          </datalist>
        </label>
        <label class="block space-y-1 text-sm">
          <span class="font-medium">Harga dasar</span>
          <input
            v-model="form.basePrice"
            name="base_price"
            inputmode="decimal"
            placeholder="350.000"
            :class="inputClass"
          />
        </label>
        <label class="block space-y-1 text-sm">
          <span class="font-medium">Pajak %</span>
          <input
            v-model="form.taxPercent"
            name="tax_percent"
            inputmode="decimal"
            :class="inputClass"
          />
          <span class="block text-xs text-gray-500">PPN umumnya 11 atau 12</span>
        </label>
      </div>

      <fieldset class="space-y-3 rounded-lg border p-3">
        <legend class="px-1 text-sm font-medium">Penagihan</legend>
        <div class="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <label class="flex items-center gap-2">
            <input v-model="form.chargeType" type="radio" name="charge_type" value="one_time" />
            Sekali bayar
          </label>
          <label class="flex items-center gap-2">
            <input v-model="form.chargeType" type="radio" name="charge_type" value="recurring" />
            Berulang
          </label>
        </div>
        <label v-if="form.chargeType === 'recurring'" class="block space-y-1 text-sm">
          <span class="font-medium">Frekuensi</span>
          <select v-model="form.frequency" name="billing_frequency" :class="inputClass">
            <option v-for="f in FREQUENCIES" :key="f.value" :value="f.value">{{ f.label }}</option>
          </select>
        </label>
        <div class="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <label class="flex items-center gap-2">
            <input
              v-model="form.paymentTiming"
              type="radio"
              name="payment_timing"
              value="prepaid"
            />
            Prabayar
          </label>
          <label class="flex items-center gap-2">
            <input
              v-model="form.paymentTiming"
              type="radio"
              name="payment_timing"
              value="postpaid"
            />
            Pascabayar
          </label>
        </div>
        <p class="text-xs text-gray-500">
          Pascabayar: ditagih setelah layanan diterima atau di akhir periode.
        </p>
      </fieldset>

      <ProductPublishingSection
        v-if="isPlatform"
        v-model="form"
        :defs="featureDefs"
        :listing-error="listingError"
        :show-features="false"
      />
      <ProductEntitlementTable v-if="isPlatform" v-model="form" :defs="featureDefs" />
      <section v-if="canTenantEntitlements" class="rounded-lg border">
        <button
          type="button"
          data-testid="advanced-toggle"
          class="flex w-full items-center justify-between px-3 py-2 text-sm font-medium"
          :aria-expanded="advancedOpen"
          @click="advancedOpen = !advancedOpen"
        >
          Advanced
          <span class="text-xs text-gray-500">{{ advancedOpen ? 'Tutup' : 'Buka' }}</span>
        </button>
        <div v-if="advancedOpen" class="border-t p-3">
          <div
            v-if="featuresQuery.isError.value"
            data-testid="features-error"
            class="flex items-center justify-between gap-2 text-sm text-red-600"
            role="alert"
          >
            <span>Daftar fitur gagal dimuat. Pengaturan fitur tidak akan disimpan.</span>
            <button
              type="button"
              data-testid="features-retry"
              class="rounded-lg border px-2 py-1 text-xs"
              @click="featuresQuery.refetch()"
            >
              Coba lagi
            </button>
          </div>
          <ProductEntitlementTable
            v-else
            v-model="form"
            :defs="featureDefs"
            :max-by-key="maxByKey"
          />
        </div>
      </section>

      <label class="block space-y-1 text-sm">
        <span class="font-medium">Deskripsi</span>
        <textarea
          v-model="form.description"
          name="description"
          rows="3"
          maxlength="5000"
          :class="inputClass"
        />
      </label>

      <label class="flex items-center gap-2 text-sm">
        <input v-model="form.isActive" type="checkbox" name="is_active" class="size-4" />
        Aktif (bisa dipilih di penawaran)
      </label>

      <p v-if="errorMessage" class="text-sm text-red-600" role="alert">{{ errorMessage }}</p>

      <div class="flex justify-end gap-3 pt-2">
        <BaseButton type="button" variant="secondary" @click="emit('close')">Batal</BaseButton>
        <BaseButton type="submit" :disabled="saveMutation.isPending.value">
          {{ saveMutation.isPending.value ? 'Menyimpan...' : 'Simpan' }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
