<script setup lang="ts">
import { computed } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'

import type { CatalogFeatureDef } from '@/features/catalog/api/catalog.api'
import {
  MAX_FEATURES,
  type FeatureRow,
  type ProductForm,
} from '@/features/catalog/utils/product-form'

const props = defineProps<{
  modelValue: ProductForm
  defs: CatalogFeatureDef[]
  listingError?: string
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: ProductForm): void }>()

const inputClass =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950'

const defByKey = computed(() => new Map(props.defs.map((d) => [d.key, d])))
const usedKeys = computed(() => new Set(props.modelValue.features.map((r) => r.key)))
const canAdd = computed(
  () => props.modelValue.features.length < MAX_FEATURES && props.defs.length > 0,
)

function patch(partial: Partial<ProductForm>) {
  emit('update:modelValue', { ...props.modelValue, ...partial })
}

function patchRow(index: number, partial: Partial<FeatureRow>) {
  patch({
    features: props.modelValue.features.map((row, i) =>
      i === index ? { ...row, ...partial } : row,
    ),
  })
}

function changeKey(index: number, key: string) {
  const def = defByKey.value.get(key)
  patchRow(index, { key, raw: def?.value_type === 'boolean' ? true : '' })
}

function addRow() {
  const free = props.defs.find((d) => !usedKeys.value.has(d.key))
  if (!free) return
  patch({
    features: [
      ...props.modelValue.features,
      { key: free.key, raw: free.value_type === 'boolean' ? true : '', displayLabel: '' },
    ],
  })
}

function removeRow(index: number) {
  patch({ features: props.modelValue.features.filter((_, i) => i !== index) })
}
</script>

<template>
  <fieldset class="space-y-4 rounded-lg border p-3">
    <legend class="px-1 text-sm font-medium">Publikasi & Fitur</legend>

    <label class="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name="is_public"
        class="size-4"
        :checked="modelValue.isPublic"
        @change="patch({ isPublic: ($event.target as HTMLInputElement).checked })"
      />
      Tampil di pricing page
    </label>

    <div class="grid gap-4 sm:grid-cols-2">
      <label class="block space-y-1 text-sm">
        <span class="font-medium">Kode listing</span>
        <input
          name="listing_code"
          :class="inputClass"
          maxlength="50"
          placeholder="freelancer"
          :value="modelValue.listingCode"
          @input="patch({ listingCode: ($event.target as HTMLInputElement).value })"
        />
        <span class="block text-xs text-gray-500">
          Varian dengan kode sama digabung jadi satu kartu (bulanan, tahunan, dst).
        </span>
        <span v-if="listingError" class="block text-xs text-red-600" role="alert">
          {{ listingError }}
        </span>
      </label>
      <label class="block space-y-1 text-sm">
        <span class="font-medium">Urutan</span>
        <input
          name="listing_order"
          inputmode="numeric"
          :class="inputClass"
          :value="modelValue.listingOrder"
          @input="patch({ listingOrder: ($event.target as HTMLInputElement).value })"
        />
      </label>
    </div>

    <div class="space-y-2">
      <p class="text-sm font-medium">Fitur</p>
      <p v-if="modelValue.features.length === 0" class="text-xs text-gray-500">
        Belum ada fitur. Fitur tampil di pricing page, penawaran, dan link penawaran.
      </p>
      <div
        v-for="(row, index) in modelValue.features"
        :key="index"
        class="grid items-end gap-2 sm:grid-cols-[1.2fr_1fr_1.2fr_auto]"
        data-testid="feature-row"
      >
        <label class="block space-y-1 text-xs">
          <span class="text-gray-500">Fitur</span>
          <select
            name="feature_key"
            :class="inputClass"
            :value="row.key"
            @change="changeKey(index, ($event.target as HTMLSelectElement).value)"
          >
            <option v-if="!defByKey.has(row.key)" :value="row.key">{{ row.key }} (nonaktif)</option>
            <option
              v-for="def in defs"
              :key="def.key"
              :value="def.key"
              :disabled="usedKeys.has(def.key) && def.key !== row.key"
            >
              {{ def.name }}
            </option>
          </select>
        </label>

        <label class="block space-y-1 text-xs">
          <span class="text-gray-500"
            >Nilai{{ defByKey.get(row.key)?.unit ? ` (${defByKey.get(row.key)?.unit})` : '' }}</span
          >
          <input
            v-if="defByKey.get(row.key)?.value_type === 'boolean'"
            type="checkbox"
            name="feature_value"
            class="size-4"
            :checked="row.raw === true"
            @change="patchRow(index, { raw: ($event.target as HTMLInputElement).checked })"
          />
          <input
            v-else
            name="feature_value"
            :class="inputClass"
            :value="String(row.raw)"
            @input="patchRow(index, { raw: ($event.target as HTMLInputElement).value })"
          />
        </label>

        <label class="block space-y-1 text-xs">
          <span class="text-gray-500">Label tampilan (opsional)</span>
          <input
            name="feature_label"
            :class="inputClass"
            maxlength="200"
            :value="row.displayLabel"
            @input="patchRow(index, { displayLabel: ($event.target as HTMLInputElement).value })"
          />
        </label>

        <BaseButton variant="outline" aria-label="Hapus fitur" @click="removeRow(index)">
          <Trash2 class="size-4" />
        </BaseButton>
      </div>

      <BaseButton variant="outline" :disabled="!canAdd" @click="addRow">
        <Plus class="size-4" />
        Tambah fitur
      </BaseButton>
      <p v-if="modelValue.features.length >= MAX_FEATURES" class="text-xs text-gray-500">
        Batas {{ MAX_FEATURES }} fitur per produk.
      </p>
    </div>
  </fieldset>
</template>
