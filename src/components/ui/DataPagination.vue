<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

import { pageWindow } from '@/lib/pagination'

const props = withDefaults(
  defineProps<{
    page: number
    perPage: number
    total: number
    perPageOptions?: number[]
    /** Noun for the "Menampilkan x–y dari n …" label. */
    itemLabel?: string
  }>(),
  { perPageOptions: () => [10, 20, 50, 100], itemLabel: 'data' },
)

const emit = defineEmits<{
  'update:page': [page: number]
  'update:perPage': [perPage: number]
}>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.perPage)))
const firstItem = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.perPage + 1))
const lastItem = computed(() => Math.min(props.page * props.perPage, props.total))
const pages = computed(() => pageWindow(props.page, totalPages.value))

function goTo(page: number) {
  if (page < 1 || page > totalPages.value || page === props.page) return
  emit('update:page', page)
}
</script>

<template>
  <nav
    class="flex flex-col gap-3 border-t px-5 py-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between dark:text-gray-400"
    aria-label="Pagination"
  >
    <p class="tabular-nums">
      <template v-if="total > 0">
        Menampilkan {{ firstItem }}–{{ lastItem }} dari {{ total }} {{ itemLabel }}
      </template>
      <template v-else>0 {{ itemLabel }}</template>
    </p>

    <div class="flex items-center gap-1">
      <button
        type="button"
        class="grid size-8 place-items-center rounded-lg border text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        :disabled="page <= 1"
        aria-label="Halaman sebelumnya"
        @click="goTo(page - 1)"
      >
        <ChevronLeft class="size-4" />
      </button>
      <template v-for="(item, index) in pages" :key="`${item}-${index}`">
        <span v-if="item === '…'" class="px-1 text-gray-400">…</span>
        <button
          v-else
          type="button"
          class="h-8 min-w-8 rounded-lg border px-2 font-medium tabular-nums"
          :class="
            item === page
              ? 'border-brand-500 bg-brand-500 text-white'
              : 'text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
          "
          :aria-current="item === page ? 'page' : undefined"
          @click="goTo(item)"
        >
          {{ item }}
        </button>
      </template>
      <button
        type="button"
        class="grid size-8 place-items-center rounded-lg border text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        :disabled="page >= totalPages"
        aria-label="Halaman berikutnya"
        @click="goTo(page + 1)"
      >
        <ChevronRight class="size-4" />
      </button>
    </div>

    <label class="flex items-center gap-2">
      Baris per halaman
      <select
        class="rounded-lg border bg-white px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
        :value="perPage"
        @change="emit('update:perPage', Number(($event.target as HTMLSelectElement).value))"
      >
        <option v-for="option in perPageOptions" :key="option" :value="option">{{ option }}</option>
      </select>
    </label>
  </nav>
</template>
