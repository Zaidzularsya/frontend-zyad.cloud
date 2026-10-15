<script setup lang="ts">
import { ArrowDown, ArrowUp, Package, Plus, Trash2 } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import { priceSuffix, type PricingAttrs } from '@/features/catalog/utils/pricing'
import LinePricingPopover from '@/features/crm/quotations/components/LinePricingPopover.vue'
import {
  blankLine,
  formatRupiah,
  type EditorLine,
  type EditorTotals,
} from '@/features/crm/quotations/utils/quotation-editor'

const props = defineProps<{
  lines: EditorLine[]
  totals: EditorTotals
  readonly: boolean
}>()

const emit = defineEmits<{
  (e: 'update:lines', lines: EditorLine[]): void
  (e: 'add-product'): void
}>()

function patch(index: number, field: keyof EditorLine, value: string) {
  const next = props.lines.map((l, i) => (i === index ? { ...l, [field]: value } : l))
  emit('update:lines', next)
}

function patchPricing(index: number, pricing: PricingAttrs) {
  const next = props.lines.map((l, i) => (i === index ? { ...l, pricing } : l))
  emit('update:lines', next)
}

function move(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= props.lines.length) return
  const next = [...props.lines]
  const [item] = next.splice(index, 1)
  if (item) next.splice(target, 0, item)
  emit('update:lines', next)
}

function remove(index: number) {
  emit(
    'update:lines',
    props.lines.filter((_, i) => i !== index),
  )
}

function addFree() {
  emit('update:lines', [...props.lines, blankLine()])
}

function visibleFeatures(line: EditorLine) {
  return line.features.filter((f) => f.label)
}

function percentLabel(value: string) {
  const n = Number((value || '0').replace(',', '.'))
  return n ? `${n}%` : '-'
}

const cell =
  'w-full rounded-md border bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950'
</script>

<template>
  <div class="space-y-3">
    <div class="overflow-x-auto">
      <table class="w-full min-w-[760px] text-left text-sm">
        <thead class="border-b text-xs uppercase text-gray-500">
          <tr>
            <th class="w-8 py-2 pr-2">#</th>
            <th class="py-2 pr-2">Deskripsi</th>
            <th class="w-20 py-2 pr-2 text-right">Qty</th>
            <th class="w-20 py-2 pr-2">Satuan</th>
            <th class="w-32 py-2 pr-2 text-right">Harga</th>
            <th class="w-20 py-2 pr-2 text-right">Diskon %</th>
            <th class="w-20 py-2 pr-2 text-right">Pajak %</th>
            <th class="w-32 py-2 pr-2 text-right">Jumlah</th>
            <th v-if="!readonly" class="w-24 py-2"><span class="sr-only">Aksi</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="lines.length === 0">
            <td :colspan="readonly ? 8 : 9" class="py-6 text-center text-sm text-gray-500">
              Belum ada item.
            </td>
          </tr>
          <tr v-for="(line, i) in lines" :key="line.key" class="border-b align-top last:border-0">
            <td class="py-2 pr-2 text-gray-500">{{ i + 1 }}</td>
            <template v-if="readonly">
              <td class="py-2 pr-2">
                <p>{{ line.description }}</p>
                <p v-if="line.sku" class="text-xs text-gray-500">{{ line.sku }}</p>
                <ul
                  v-if="visibleFeatures(line).length"
                  data-testid="line-features"
                  class="mt-1 list-disc space-y-0.5 pl-4 text-xs text-gray-500"
                >
                  <li v-for="f in visibleFeatures(line)" :key="f.feature_key">{{ f.label }}</li>
                </ul>
                <LinePricingPopover :model-value="line.pricing" :uid="line.key" disabled />
              </td>
              <td class="py-2 pr-2 text-right tabular-nums">{{ Number(line.quantity) }}</td>
              <td class="py-2 pr-2">{{ line.unit || '-' }}</td>
              <td class="py-2 pr-2 text-right tabular-nums">
                {{ formatRupiah(line.unitPrice) }}{{ priceSuffix(line.pricing) }}
              </td>
              <td class="py-2 pr-2 text-right">{{ percentLabel(line.discountPercent) }}</td>
              <td class="py-2 pr-2 text-right">{{ percentLabel(line.taxPercent) }}</td>
            </template>
            <template v-else>
              <td class="py-2 pr-2">
                <input
                  :value="line.description"
                  name="item-description"
                  :aria-label="`Deskripsi item ${i + 1}`"
                  maxlength="500"
                  :class="cell"
                  @input="patch(i, 'description', ($event.target as HTMLInputElement).value)"
                />
                <p v-if="line.sku" class="mt-1 text-xs text-gray-500">SKU {{ line.sku }}</p>
                <ul
                  v-if="visibleFeatures(line).length"
                  data-testid="line-features"
                  class="mt-1 list-disc space-y-0.5 pl-4 text-xs text-gray-500"
                >
                  <li v-for="f in visibleFeatures(line)" :key="f.feature_key">{{ f.label }}</li>
                </ul>
                <LinePricingPopover
                  class="mt-1"
                  :model-value="line.pricing"
                  :uid="line.key"
                  :disabled="false"
                  @update:model-value="patchPricing(i, $event)"
                />
              </td>
              <td class="py-2 pr-2">
                <input
                  :value="line.quantity"
                  inputmode="decimal"
                  :aria-label="`Qty item ${i + 1}`"
                  :class="[cell, 'text-right']"
                  @input="patch(i, 'quantity', ($event.target as HTMLInputElement).value)"
                />
              </td>
              <td class="py-2 pr-2">
                <input
                  :value="line.unit"
                  :aria-label="`Satuan item ${i + 1}`"
                  maxlength="30"
                  :class="cell"
                  @input="patch(i, 'unit', ($event.target as HTMLInputElement).value)"
                />
              </td>
              <td class="py-2 pr-2">
                <input
                  :value="line.unitPrice"
                  inputmode="decimal"
                  placeholder="0"
                  :aria-label="`Harga item ${i + 1}`"
                  :class="[cell, 'text-right']"
                  @input="patch(i, 'unitPrice', ($event.target as HTMLInputElement).value)"
                />
                <span
                  v-if="priceSuffix(line.pricing)"
                  class="block text-right text-xs text-gray-500"
                >
                  {{ priceSuffix(line.pricing) }}
                </span>
              </td>
              <td class="py-2 pr-2">
                <input
                  :value="line.discountPercent"
                  inputmode="decimal"
                  placeholder="0"
                  :aria-label="`Diskon item ${i + 1}`"
                  :class="[cell, 'text-right']"
                  @input="patch(i, 'discountPercent', ($event.target as HTMLInputElement).value)"
                />
              </td>
              <td class="py-2 pr-2">
                <input
                  :value="line.taxPercent"
                  inputmode="decimal"
                  :aria-label="`Pajak item ${i + 1}`"
                  :class="[cell, 'text-right']"
                  @input="patch(i, 'taxPercent', ($event.target as HTMLInputElement).value)"
                />
              </td>
            </template>
            <td class="py-2 pr-2 text-right font-medium tabular-nums">
              {{ formatRupiah(totals.lines[i]?.net ?? '0') }}
            </td>
            <td v-if="!readonly" class="py-2">
              <div class="flex justify-end gap-1">
                <button
                  type="button"
                  class="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
                  :disabled="i === 0"
                  :aria-label="`Naikkan item ${i + 1}`"
                  @click="move(i, -1)"
                >
                  <ArrowUp class="size-4" />
                </button>
                <button
                  type="button"
                  class="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
                  :disabled="i === lines.length - 1"
                  :aria-label="`Turunkan item ${i + 1}`"
                  @click="move(i, 1)"
                >
                  <ArrowDown class="size-4" />
                </button>
                <button
                  type="button"
                  class="rounded p-1 text-gray-500 hover:bg-red-50 hover:text-red-600"
                  :aria-label="`Hapus item ${i + 1}`"
                  @click="remove(i)"
                >
                  <Trash2 class="size-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="!readonly" class="flex flex-wrap gap-2">
      <BaseButton variant="outline" @click="emit('add-product')">
        <Package class="size-4" />
        Tambah produk
      </BaseButton>
      <BaseButton variant="outline" @click="addFree">
        <Plus class="size-4" />
        Baris bebas
      </BaseButton>
    </div>
  </div>
</template>
