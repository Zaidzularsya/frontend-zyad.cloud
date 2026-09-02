<script setup lang="ts">
type Spacing = { top?: number; bottom?: number }

const props = defineProps<{
  modelValue?: Spacing | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Spacing]
}>()

function num(value: unknown): number | undefined {
  const n = Number(value)
  return Number.isFinite(n) && String(value).trim() !== '' ? n : undefined
}

function set(edge: 'top' | 'bottom', value: string) {
  emit('update:modelValue', { ...(props.modelValue ?? {}), [edge]: num(value) })
}
</script>

<template>
  <div class="grid grid-cols-2 gap-2">
    <label class="text-xs text-gray-500">
      Atas (px)
      <input
        type="number"
        min="0"
        :value="modelValue?.top ?? ''"
        class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        @input="set('top', ($event.target as HTMLInputElement).value)"
      />
    </label>
    <label class="text-xs text-gray-500">
      Bawah (px)
      <input
        type="number"
        min="0"
        :value="modelValue?.bottom ?? ''"
        class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        @input="set('bottom', ($event.target as HTMLInputElement).value)"
      />
    </label>
  </div>
</template>
