<script setup lang="ts">
import type { SectionFieldSchema } from '@/features/landing/shared/constants/section-schemas'
import RichTextField from './RichTextField.vue'

const props = defineProps<{
  content: Record<string, unknown>
  schema: SectionFieldSchema[]
}>()

const emit = defineEmits<{
  (e: 'field-change', key: string, value: unknown): void
}>()

function valueAt(key: string) {
  return props.content[key]
}

function repeaterItems(key: string): Record<string, unknown>[] {
  const value = props.content[key]
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : []
}

function updateRepeaterItemField(
  field: SectionFieldSchema,
  index: number,
  itemKey: string,
  itemValue: unknown,
) {
  const items = repeaterItems(field.key).map((item) => ({ ...item }))
  items[index] = { ...items[index], [itemKey]: itemValue }
  emit('field-change', field.key, items)
}

function addRepeaterItem(field: SectionFieldSchema) {
  const items = repeaterItems(field.key).map((item) => ({ ...item }))
  const blank: Record<string, unknown> = {}
  for (const itemField of field.itemSchema ?? []) {
    blank[itemField.key] = itemField.type === 'checkbox' ? false : ''
  }
  items.push(blank)
  emit('field-change', field.key, items)
}

function removeRepeaterItem(field: SectionFieldSchema, index: number) {
  emit(
    'field-change',
    field.key,
    repeaterItems(field.key).filter((_, i) => i !== index),
  )
}

function inputType(type: SectionFieldSchema['type']) {
  if (type === 'number') return 'number'
  if (type === 'url' || type === 'image') return 'url'
  return 'text'
}
</script>

<template>
  <div class="grid gap-5">
    <div v-for="field in schema" :key="field.key">
      <label class="block text-sm font-medium">
        {{ field.label }}
        <span v-if="field.required" class="text-red-500">*</span>

        <RichTextField
          v-if="field.type === 'richtext'"
          :model-value="String(valueAt(field.key) ?? '')"
          class="mt-1"
          @update:model-value="emit('field-change', field.key, $event)"
        />

        <textarea
          v-else-if="field.type === 'textarea'"
          :value="String(valueAt(field.key) ?? '')"
          :placeholder="field.placeholder"
          rows="4"
          class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          @input="emit('field-change', field.key, ($event.target as HTMLTextAreaElement).value)"
        ></textarea>

        <span
          v-else-if="field.type === 'checkbox'"
          class="mt-2 flex items-center gap-2 rounded-xl border px-3 py-2.5 dark:border-gray-700"
        >
          <input
            type="checkbox"
            :checked="Boolean(valueAt(field.key))"
            @change="emit('field-change', field.key, ($event.target as HTMLInputElement).checked)"
          />
          <span class="text-sm text-gray-500">Enabled</span>
        </span>

        <select
          v-else-if="field.type === 'select'"
          :value="String(valueAt(field.key) ?? '')"
          class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          @change="emit('field-change', field.key, ($event.target as HTMLSelectElement).value)"
        >
          <option value="">—</option>
          <option v-for="option in field.options ?? []" :key="option" :value="option">
            {{ option }}
          </option>
        </select>

        <div v-else-if="field.type === 'repeater'" class="mt-2 space-y-3">
          <div
            v-for="(item, index) in repeaterItems(field.key)"
            :key="index"
            class="space-y-3 rounded-xl border p-3 dark:border-gray-700"
          >
            <div class="grid gap-3 md:grid-cols-2">
              <label
                v-for="itemField in field.itemSchema ?? []"
                :key="itemField.key"
                class="block text-xs font-medium text-gray-500"
              >
                {{ itemField.label }}
                <span
                  v-if="itemField.type === 'checkbox'"
                  class="mt-1 flex items-center gap-2 rounded-lg border px-2.5 py-2 dark:border-gray-700"
                >
                  <input
                    type="checkbox"
                    :checked="Boolean(item[itemField.key])"
                    @change="
                      updateRepeaterItemField(
                        field,
                        index,
                        itemField.key,
                        ($event.target as HTMLInputElement).checked,
                      )
                    "
                  />
                </span>
                <textarea
                  v-else-if="itemField.type === 'textarea' || itemField.type === 'richtext'"
                  :value="String(item[itemField.key] ?? '')"
                  rows="3"
                  class="mt-1 w-full rounded-lg border px-2.5 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
                  @input="
                    updateRepeaterItemField(
                      field,
                      index,
                      itemField.key,
                      ($event.target as HTMLTextAreaElement).value,
                    )
                  "
                ></textarea>
                <input
                  v-else
                  :value="String(item[itemField.key] ?? '')"
                  class="mt-1 w-full rounded-lg border px-2.5 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
                  @input="
                    updateRepeaterItemField(
                      field,
                      index,
                      itemField.key,
                      ($event.target as HTMLInputElement).value,
                    )
                  "
                />
              </label>
            </div>
            <button
              type="button"
              class="text-xs font-semibold text-red-600 hover:underline"
              @click="removeRepeaterItem(field, index)"
            >
              Remove
            </button>
          </div>
          <button
            type="button"
            class="rounded-lg border px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            @click="addRepeaterItem(field)"
          >
            + Add item
          </button>
        </div>

        <input
          v-else
          :type="inputType(field.type)"
          :value="String(valueAt(field.key) ?? '')"
          :placeholder="field.placeholder"
          class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          @input="
            emit(
              'field-change',
              field.key,
              field.type === 'number'
                ? Number(($event.target as HTMLInputElement).value)
                : ($event.target as HTMLInputElement).value,
            )
          "
        />
      </label>
    </div>
  </div>
</template>
