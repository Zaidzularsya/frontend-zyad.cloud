<script setup lang="ts">
import type { PageTemplateBlueprint } from '../config/page-blueprints'

const props = defineProps<{
  blueprint: PageTemplateBlueprint
}>()

function colorValue(name: string, fallback: string) {
  const value = props.blueprint.branding.colors[name]
  return typeof value === 'string' && value ? value : fallback
}
</script>

<template>
  <div
    class="overflow-hidden rounded-lg border bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950"
  >
    <div class="space-y-2 bg-gray-100 p-2 dark:bg-gray-900">
      <div class="flex items-center justify-between rounded bg-white px-2 py-1.5 dark:bg-gray-950">
        <span
          class="h-3 w-20 rounded"
          :style="{ backgroundColor: colorValue('primary', '#0f172a') }"
        ></span>
        <div class="flex gap-1">
          <span
            v-for="item in blueprint.header.items.slice(0, 4)"
            :key="item.destination"
            class="h-2 w-8 rounded bg-gray-200 dark:bg-gray-800"
          ></span>
        </div>
      </div>

      <div
        class="rounded p-3 text-white"
        :style="{ backgroundColor: colorValue('primary', '#0f172a') }"
      >
        <span class="block h-2 w-16 rounded bg-white/30"></span>
        <span class="mt-2 block h-3 w-3/4 rounded bg-white"></span>
        <span class="mt-1.5 block h-2 w-1/2 rounded bg-white/60"></span>
        <span
          class="mt-3 block h-4 w-20 rounded-full"
          :style="{ backgroundColor: colorValue('secondary', '#14b8a6') }"
        ></span>
      </div>

      <div class="grid gap-1.5">
        <div
          v-for="section in blueprint.sections.slice(1, 5)"
          :key="section.key"
          class="flex items-center justify-between rounded bg-white px-2 py-2 dark:bg-gray-950"
        >
          <span class="h-2 w-24 rounded bg-gray-300 dark:bg-gray-700"></span>
          <span
            class="h-5 w-10 rounded"
            :style="{ backgroundColor: colorValue('accent', '#38bdf8') }"
          ></span>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-1 rounded bg-gray-800 p-2">
        <span v-for="index in 4" :key="index" class="h-5 rounded bg-white/15"></span>
      </div>
    </div>
  </div>
</template>
