<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronDown, Copy, Trash2 } from 'lucide-vue-next'

import { resolveBlockForSection } from '@/features/landing/shared/blocks/catalog'
import type { LandingSection } from '@/features/landing/shared/types/landing.types'
import { useLandingBuilderStore } from '@/stores/landingBuilder'
import SectionContentForm from './SectionContentForm.vue'
import AppearanceForm from './AppearanceForm.vue'
import SpacingField from './fields/SpacingField.vue'

const props = defineProps<{
  section: LandingSection
}>()

const store = useLandingBuilderStore()

const block = computed(() => resolveBlockForSection(props.section))
const schema = computed(() => block.value?.schema ?? [])
const style = computed(() => (props.section.style ?? {}) as Record<string, unknown>)
const spacing = computed(() => (style.value.spacing ?? {}) as { top?: number; bottom?: number })

function patchContentField(key: string, value: unknown) {
  store.patchSection(props.section.id, {
    content: { ...(props.section.content ?? {}), [key]: value },
  })
}

function patchNestedStyle(key: 'spacing', partial: Record<string, unknown>) {
  const current = (style.value[key] ?? {}) as Record<string, unknown>
  store.patchSection(props.section.id, {
    style: { ...style.value, [key]: { ...current, ...partial } },
  })
}

// ── Advanced: editable JSON buffers, re-seeded when the selection changes ──────
const contentJson = ref('')
const styleJson = ref('')
const jsonError = ref('')

watch(
  () => props.section.id,
  () => {
    contentJson.value = JSON.stringify(props.section.content ?? {}, null, 2)
    styleJson.value = JSON.stringify(props.section.style ?? {}, null, 2)
    jsonError.value = ''
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
          Blok aktif
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

    <details class="group rounded-lg border border-gray-200 dark:border-gray-700" open>
      <summary
        class="flex cursor-pointer items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500"
      >
        Content
        <ChevronDown class="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <div class="border-t border-gray-100 px-3 py-3 dark:border-gray-800">
        <p
          v-if="schema.length === 0"
          class="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-gray-400"
        >
          Blok ini tidak punya field konten. Gunakan Advanced bila perlu.
        </p>
        <SectionContentForm
          v-else
          :schema="schema"
          :content="section.content ?? {}"
          @field-change="patchContentField"
        />
      </div>
    </details>

    <details class="group rounded-lg border border-gray-200 dark:border-gray-700">
      <summary
        class="flex cursor-pointer items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500"
      >
        Appearance
        <ChevronDown class="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <div class="border-t border-gray-100 px-3 py-3 dark:border-gray-800">
        <AppearanceForm :section="section" />
      </div>
    </details>

    <details class="group rounded-lg border border-gray-200 dark:border-gray-700">
      <summary
        class="flex cursor-pointer items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500"
      >
        Spacing
        <ChevronDown class="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <div class="border-t border-gray-100 px-3 py-3 dark:border-gray-800">
        <span class="text-xs font-medium text-gray-500">Jarak vertikal</span>
        <SpacingField
          class="mt-1"
          :model-value="spacing"
          @update:model-value="patchNestedStyle('spacing', $event)"
        />
      </div>
    </details>

    <details class="group rounded-lg border border-gray-200 dark:border-gray-700">
      <summary
        class="flex cursor-pointer items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500"
      >
        Advanced
        <ChevronDown class="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <div class="space-y-3 border-t border-gray-100 px-3 py-3 text-sm dark:border-gray-800">
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
    </details>
  </div>
</template>
