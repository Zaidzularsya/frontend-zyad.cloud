<script setup lang="ts">
import { ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

import type { CatalogCategory, CatalogProduct } from '@/features/catalog/api/catalog.api'
import { useSaveProductMutation } from '@/features/catalog/api/catalog.queries'
import { catalogErrorMessage } from '@/features/catalog/utils/errors'
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
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const UNITS = ['pcs', 'unit', 'paket', 'bulan', 'tahun', 'jam', 'hari', 'meter']

const form = ref<ProductForm>(emptyProductForm())
const errorMessage = ref('')
const saveMutation = useSaveProductMutation()

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.value = props.product ? productToForm(props.product) : emptyProductForm()
    errorMessage.value = ''
  },
)

async function submit() {
  const invalid = validateProductForm(form.value)
  if (invalid) {
    errorMessage.value = invalid
    return
  }
  errorMessage.value = ''
  try {
    await saveMutation.mutateAsync({
      id: props.product?.id,
      payload: buildProductPayload(form.value, { editing: Boolean(props.product) }),
    })
    emit('saved')
  } catch (error) {
    errorMessage.value = catalogErrorMessage(error)
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
