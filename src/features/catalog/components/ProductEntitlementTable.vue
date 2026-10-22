<script setup lang="ts">
import { computed, ref } from 'vue'

import type { CatalogFeatureDef } from '@/features/catalog/api/catalog.api'
import {
  applyRowChange,
  availableStatuses,
  resetLabel,
  STATUS_LABEL,
  statusOfRow,
  type RowStatus,
} from '@/features/catalog/utils/entitlement-rows'
import { MAX_FEATURES, type ProductForm } from '@/features/catalog/utils/product-form'

const props = defineProps<{
  modelValue: ProductForm
  defs: CatalogFeatureDef[]
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: ProductForm): void }>()

const message = ref('')

const inputClass =
  'w-full rounded-lg border bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-500 disabled:opacity-50 dark:bg-gray-950'

// Hanya fitur boolean/integer yang bisa diatur di tabel ini; tipe lain tetap dipertahankan di form.
const supported = computed(() => props.defs.filter((d) => availableStatuses(d).length > 0))

const groups = computed(() => {
  const byModule = new Map<string, CatalogFeatureDef[]>()
  for (const def of supported.value) {
    byModule.set(def.module, [...(byModule.get(def.module) ?? []), def])
  }
  return [...byModule].map(([module, defs]) => ({ module, defs }))
})

const rowByKey = computed(() => new Map(props.modelValue.features.map((r) => [r.key, r])))
const hiddenCount = computed(
  () =>
    props.modelValue.features.length -
    supported.value.filter((d) => rowByKey.value.has(d.key)).length,
)

function view(def: CatalogFeatureDef) {
  const row = rowByKey.value.get(def.key)
  const status: RowStatus = row ? statusOfRow(def, row.raw) : availableStatuses(def)[0]!
  const defaultStatus = def.value_type === 'boolean' ? 'hidden' : status
  return {
    status: row ? status : defaultStatus,
    limit: def.value_type === 'integer' && row ? String(row.raw) : '',
    isDefault: !row,
  }
}

function change(def: CatalogFeatureDef, status: RowStatus, limit = '') {
  const result = applyRowChange(props.modelValue.features, def, status, limit)
  message.value = result.error ?? ''
  if (result.error) return
  emit('update:modelValue', { ...props.modelValue, features: result.features })
}
</script>

<template>
  <fieldset class="space-y-3 rounded-lg border p-3">
    <legend class="px-1 text-sm font-medium">Entitlement</legend>
    <div class="flex items-center justify-between text-xs text-gray-500">
      <span>Hanya fitur yang diatur yang disimpan; sisanya Disembunyikan.</span>
      <span data-testid="entitlement-counter">
        {{ modelValue.features.length }} / {{ MAX_FEATURES }} fitur
      </span>
    </div>
    <p v-if="message" class="text-xs text-red-600" role="alert">{{ message }}</p>
    <p v-if="hiddenCount > 0" class="text-xs text-gray-500">
      {{ hiddenCount }} fitur lain (tipe lain atau nonaktif) dipertahankan dan tidak diubah di
      tabel.
    </p>

    <section
      v-for="group in groups"
      :key="group.module"
      data-testid="entitlement-group"
      :data-module="group.module"
      class="space-y-1"
    >
      <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {{ group.module }}
      </h4>
      <div class="grid grid-cols-[1.4fr_1fr_0.8fr_0.7fr] gap-2 border-b pb-1 text-xs font-semibold">
        <span>Fitur</span><span>Status</span><span>Batas</span><span>Reset</span>
      </div>
      <div
        v-for="def in group.defs"
        :key="def.key"
        data-testid="entitlement-row"
        :data-key="def.key"
        class="grid grid-cols-[1.4fr_1fr_0.8fr_0.7fr] items-center gap-2 py-1 text-sm"
      >
        <span>
          {{ def.name }}
          <small class="block text-xs text-gray-500">{{ def.key }}</small>
        </span>
        <select
          name="status"
          :class="inputClass"
          :value="view(def).status"
          :aria-label="`Status ${def.name}`"
          @change="
            change(def, ($event.target as HTMLSelectElement).value as RowStatus, view(def).limit)
          "
        >
          <option v-for="s in availableStatuses(def)" :key="s" :value="s">
            {{ STATUS_LABEL[s] }}
          </option>
        </select>
        <input
          name="limit"
          type="number"
          min="0"
          step="1"
          inputmode="numeric"
          :class="inputClass"
          :value="view(def).limit"
          :disabled="view(def).status !== 'quota'"
          :aria-label="`Batas ${def.name}`"
          @change="change(def, 'quota', ($event.target as HTMLInputElement).value)"
        />
        <span data-testid="reset" class="text-gray-600">
          {{ view(def).status === 'quota' ? resetLabel(def.reset_strategy) : '-' }}
        </span>
      </div>
    </section>
  </fieldset>
</template>
