<script setup lang="ts">
import { computed } from 'vue'

import type { LandingSection } from '@/features/landing/shared/types/landing.types'
import { useLandingBuilderStore } from '@/stores/landingBuilder'
import ColorField from './fields/ColorField.vue'

const props = defineProps<{
  section: LandingSection
}>()

const store = useLandingBuilderStore()

const style = computed(() => (props.section.style ?? {}) as Record<string, unknown>)
const variant = computed(
  () => props.section.variant ?? (style.value.variant as string | undefined) ?? '',
)
const isElement = computed(() => variant.value.startsWith('element.'))
const showTypography = computed(() =>
  ['element.headline', 'element.paragraph', 'element.button'].includes(variant.value),
)
const showColors = computed(() => variant.value === 'element.button')
const showBox = computed(() =>
  ['element.button', 'element.image', 'element.divider'].includes(variant.value),
)

const FOOTER_VARIANTS = ['default', 'simple', 'newsletter', 'mega']
const ALIGN_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'left', label: 'Kiri' },
  { value: 'center', label: 'Tengah' },
  { value: 'right', label: 'Kanan' },
]
const WEIGHT_OPTIONS = ['400', '500', '600', '700', '800']
const SHADOW_OPTIONS = ['none', 'sm', 'md', 'lg']

const typography = computed(() => (style.value.typography ?? {}) as Record<string, unknown>)
const colors = computed(() => (style.value.colors ?? {}) as Record<string, unknown>)
const box = computed(() => (style.value.box ?? {}) as Record<string, unknown>)
const background = computed(() => (style.value.background ?? {}) as Record<string, unknown>)

function patchStyle(partial: Record<string, unknown>) {
  store.patchSection(props.section.id, { style: { ...style.value, ...partial } })
}

function patchNested(
  key: 'typography' | 'colors' | 'box' | 'background',
  partial: Record<string, unknown>,
) {
  const current = (style.value[key] ?? {}) as Record<string, unknown>
  const next: Record<string, unknown> = { ...current }
  for (const [k, v] of Object.entries(partial)) {
    if (v === undefined || v === '' || (typeof v === 'number' && Number.isNaN(v))) delete next[k]
    else next[k] = v
  }
  patchStyle({ [key]: next })
}

function numOrUndef(value: string): number | undefined {
  const n = Number(value)
  return value.trim() !== '' && Number.isFinite(n) ? n : undefined
}
</script>

<template>
  <div class="space-y-4 text-sm">
    <label v-if="section.type === 'footer'" class="block">
      <span class="text-xs font-medium text-gray-500">Varian footer</span>
      <select
        :value="String(style.variant ?? 'default')"
        class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        @change="patchStyle({ variant: ($event.target as HTMLSelectElement).value })"
      >
        <option v-for="v in FOOTER_VARIANTS" :key="v" :value="v">{{ v }}</option>
      </select>
    </label>

    <label class="block">
      <span class="text-xs font-medium text-gray-500">Perataan</span>
      <select
        :value="String(style.align ?? '')"
        class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        @change="patchStyle({ align: ($event.target as HTMLSelectElement).value || undefined })"
      >
        <option v-for="opt in ALIGN_OPTIONS" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </label>

    <template v-if="showTypography">
      <div class="grid grid-cols-2 gap-2">
        <label class="text-xs text-gray-500">
          Ukuran font (px)
          <input
            type="number"
            min="8"
            :value="(typography.size as number) ?? ''"
            class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
            @input="
              patchNested('typography', {
                size: numOrUndef(($event.target as HTMLInputElement).value),
              })
            "
          />
        </label>
        <label class="text-xs text-gray-500">
          Ketebalan
          <select
            :value="String(typography.weight ?? '')"
            class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
            @change="
              patchNested('typography', {
                weight: ($event.target as HTMLSelectElement).value || undefined,
              })
            "
          >
            <option value="">Default</option>
            <option v-for="w in WEIGHT_OPTIONS" :key="w" :value="w">{{ w }}</option>
          </select>
        </label>
      </div>
      <label class="block text-xs text-gray-500">
        Tinggi baris
        <input
          type="number"
          min="1"
          step="0.1"
          :value="(typography.lineHeight as number) ?? ''"
          class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          @input="
            patchNested('typography', {
              lineHeight: numOrUndef(($event.target as HTMLInputElement).value),
            })
          "
        />
      </label>
      <div>
        <span class="text-xs font-medium text-gray-500">Warna teks</span>
        <ColorField
          class="mt-1"
          :model-value="(typography.color as string) ?? ''"
          @update:model-value="patchNested('typography', { color: $event || undefined })"
        />
      </div>
    </template>

    <template v-if="showColors">
      <div>
        <span class="text-xs font-medium text-gray-500">Warna latar tombol</span>
        <ColorField
          class="mt-1"
          :model-value="(colors.primary as string) ?? ''"
          @update:model-value="patchNested('colors', { primary: $event || undefined })"
        />
      </div>
      <div>
        <span class="text-xs font-medium text-gray-500">Warna label tombol</span>
        <ColorField
          class="mt-1"
          :model-value="(colors.text as string) ?? ''"
          @update:model-value="patchNested('colors', { text: $event || undefined })"
        />
      </div>
    </template>

    <template v-if="showBox">
      <div class="grid grid-cols-2 gap-2">
        <label v-if="variant !== 'element.divider'" class="text-xs text-gray-500">
          Sudut membulat (px)
          <input
            type="number"
            min="0"
            :value="(box.radius as number) ?? ''"
            class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
            @input="
              patchNested('box', { radius: numOrUndef(($event.target as HTMLInputElement).value) })
            "
          />
        </label>
        <label class="text-xs text-gray-500">
          Lebar maks (px)
          <input
            type="number"
            min="0"
            :value="(box.width as number) ?? ''"
            :disabled="Boolean(box.fullWidth)"
            class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-950"
            @input="
              patchNested('box', { width: numOrUndef(($event.target as HTMLInputElement).value) })
            "
          />
        </label>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <label class="text-xs text-gray-500">
          Tebal garis (px)
          <input
            type="number"
            min="0"
            :value="(box.borderWidth as number) ?? ''"
            class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
            @input="
              patchNested('box', {
                borderWidth: numOrUndef(($event.target as HTMLInputElement).value),
              })
            "
          />
        </label>
        <label v-if="variant !== 'element.divider'" class="text-xs text-gray-500">
          Bayangan
          <select
            :value="String(box.shadow ?? '')"
            class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
            @change="
              patchNested('box', {
                shadow: ($event.target as HTMLSelectElement).value || undefined,
              })
            "
          >
            <option value="">Default</option>
            <option v-for="s in SHADOW_OPTIONS" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>
      </div>
      <div>
        <span class="text-xs font-medium text-gray-500">Warna garis</span>
        <ColorField
          class="mt-1"
          :model-value="(box.borderColor as string) ?? ''"
          @update:model-value="patchNested('box', { borderColor: $event || undefined })"
        />
      </div>
      <label
        v-if="variant !== 'element.divider'"
        class="flex items-center gap-2 text-xs text-gray-500"
      >
        <input
          type="checkbox"
          :checked="Boolean(box.fullWidth)"
          @change="
            patchNested('box', {
              fullWidth: ($event.target as HTMLInputElement).checked || undefined,
            })
          "
        />
        Lebar penuh
      </label>
    </template>

    <div v-if="!isElement">
      <span class="text-xs font-medium text-gray-500">Warna latar</span>
      <ColorField
        class="mt-1"
        :model-value="(background.color as string) ?? ''"
        @update:model-value="patchNested('background', { color: $event || undefined })"
      />
    </div>

    <p class="text-xs text-gray-400">
      Latar &amp; jarak diterapkan generik oleh renderer; sebagian gaya section lama hanya berlaku
      di template enterprise.
    </p>
  </div>
</template>
