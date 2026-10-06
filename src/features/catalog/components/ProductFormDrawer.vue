<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

import type { CatalogCategory, CatalogProduct } from '@/features/catalog/api/catalog.api'
import {
  useCatalogFeaturesQuery,
  useSaveProductMutation,
} from '@/features/catalog/api/catalog.queries'
import ProductPublishingSection from '@/features/catalog/components/ProductPublishingSection.vue'
import { catalogErrorMessage, errorCode } from '@/features/catalog/utils/errors'
import {
  buildProductPayload,
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
const featuresQuery = useCatalogFeaturesQuery(isPlatform)
const featureDefs = computed(() => featuresQuery.data.value ?? [])
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
  },
)

// Registry fitur bisa tiba setelah drawer dibuka; baris yang sudah dimuat perlu nilai bertipe.
watch(featureDefs, (defs) => {
  if (props.open && props.product && isPlatform.value)
    form.value = productToForm(props.product, defs)
})

async function submit() {
  const platformOpts = { platform: isPlatform.value, featureDefs: featureDefs.value }
  const invalid = validateProductForm(form.value, platformOpts)
  if (invalid) {
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
      />

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
