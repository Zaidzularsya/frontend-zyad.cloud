<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Copy, Trash2 } from 'lucide-vue-next'

import { resolveBlockForSection } from '@/features/landing/shared/blocks/catalog'
import type { LandingSection } from '@/features/landing/shared/types/landing.types'
import { useLandingBuilderStore } from '@/stores/landingBuilder'
import SectionContentForm from './SectionContentForm.vue'
import ColorField from './fields/ColorField.vue'
import SpacingField from './fields/SpacingField.vue'

const props = defineProps<{
  section: LandingSection
}>()

const store = useLandingBuilderStore()

type Tab = 'content' | 'style' | 'advanced'
const tab = ref<Tab>('content')

const block = computed(() => resolveBlockForSection(props.section))
const schema = computed(() => block.value?.schema ?? [])
const style = computed(() => (props.section.style ?? {}) as Record<string, unknown>)

const FOOTER_VARIANTS = ['default', 'simple', 'newsletter', 'mega']
const ALIGN_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'left', label: 'Kiri' },
  { value: 'center', label: 'Tengah' },
  { value: 'right', label: 'Kanan' },
]

function patchContentField(key: string, value: unknown) {
  store.patchSection(props.section.id, {
    content: { ...(props.section.content ?? {}), [key]: value },
  })
}

function patchStyle(partial: Record<string, unknown>) {
  store.patchSection(props.section.id, { style: { ...style.value, ...partial } })
}

function patchNestedStyle(key: 'spacing' | 'background', partial: Record<string, unknown>) {
  const current = (style.value[key] ?? {}) as Record<string, unknown>
  patchStyle({ [key]: { ...current, ...partial } })
}

const background = computed(() => (style.value.background ?? {}) as Record<string, unknown>)
const spacing = computed(() => (style.value.spacing ?? {}) as { top?: number; bottom?: number })

// Advanced tab: editable JSON buffers, re-seeded when the selection changes.
const contentJson = ref('')
const styleJson = ref('')
const jsonError = ref('')

watch(
  () => props.section.id,
  () => {
    contentJson.value = JSON.stringify(props.section.content ?? {}, null, 2)
    styleJson.value = JSON.stringify(props.section.style ?? {}, null, 2)
    jsonError.value = ''
    tab.value = 'content'
  },
  { immediate: true },
)

function applyJson(which: 'content' | 'style') {
  try {
    const parsed = JSON.parse(which === 'content' ? contentJson.value : styleJson.value)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('Harus berupa object')
    }
    store.patchSection(props.section.id, { [which]: parsed })
    jsonError.value = ''
  } catch (error) {
    jsonError.value = `JSON ${which} tidak valid: ${(error as Error).message}`
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="space-y-2">
      <input
        :value="section.name"
        class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        @change="
          store.patchSection(section.id, { name: ($event.target as HTMLInputElement).value })
        "
      />
      <div class="flex items-center gap-2">
        <label class="flex flex-1 items-center gap-2 text-sm">
          <input
            type="checkbox"
            :checked="section.is_enabled !== false"
            @change="
              store.patchSection(section.id, {
                is_enabled: ($event.target as HTMLInputElement).checked,
              })
            "
          />
          Section aktif
        </label>
        <button
          type="button"
          class="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
          title="Duplikat"
          @click="store.duplicateBlock(section.id)"
        >
          <Copy class="size-4" />
        </button>
        <button
          type="button"
          class="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
          title="Hapus"
          @click="store.removeBlock(section.id)"
        >
          <Trash2 class="size-4" />
        </button>
      </div>
    </div>

    <div class="flex gap-1 rounded-lg bg-gray-100 p-0.5 text-xs font-semibold dark:bg-gray-800">
      <button
        v-for="option in ['content', 'style', 'advanced'] as Tab[]"
        :key="option"
        type="button"
        class="flex-1 rounded px-2 py-1.5 capitalize"
        :class="tab === option ? 'bg-white shadow-sm dark:bg-gray-950' : 'text-gray-500'"
        @click="tab = option"
      >
        {{ option === 'content' ? 'Konten' : option === 'style' ? 'Gaya' : 'Advanced' }}
      </button>
    </div>

    <div v-if="tab === 'content'">
      <p
        v-if="schema.length === 0"
        class="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-gray-400"
      >
        Blok ini tidak punya field konten. Gunakan tab Advanced.
      </p>
      <SectionContentForm
        v-else
        :schema="schema"
        :content="section.content ?? {}"
        @field-change="patchContentField"
      />
    </div>

    <div v-else-if="tab === 'style'" class="space-y-4 text-sm">
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
        <span class="text-xs font-medium text-gray-500">Perataan teks</span>
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

      <div>
        <span class="text-xs font-medium text-gray-500">Jarak vertikal</span>
        <SpacingField
          class="mt-1"
          :model-value="spacing"
          @update:model-value="patchNestedStyle('spacing', $event)"
        />
      </div>

      <div>
        <span class="text-xs font-medium text-gray-500">Warna latar</span>
        <ColorField
          class="mt-1"
          :model-value="(background.color as string) ?? ''"
          @update:model-value="patchNestedStyle('background', { color: $event || undefined })"
        />
      </div>

      <p class="text-xs text-gray-400">
        Sebagian gaya hanya berlaku di template enterprise; latar & jarak diterapkan generik oleh
        renderer.
      </p>
    </div>

    <div v-else class="space-y-3 text-sm">
      <label class="block">
        <span class="text-xs font-medium text-gray-500">content (JSON)</span>
        <textarea
          v-model="contentJson"
          rows="8"
          class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        ></textarea>
        <button
          type="button"
          class="mt-1 rounded border px-2 py-1 text-xs font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          @click="applyJson('content')"
        >
          Terapkan content
        </button>
      </label>
      <label class="block">
        <span class="text-xs font-medium text-gray-500">style (JSON)</span>
        <textarea
          v-model="styleJson"
          rows="6"
          class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        ></textarea>
        <button
          type="button"
          class="mt-1 rounded border px-2 py-1 text-xs font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          @click="applyJson('style')"
        >
          Terapkan style
        </button>
      </label>
      <p v-if="jsonError" class="text-xs text-red-600">{{ jsonError }}</p>
    </div>
  </div>
</template>
