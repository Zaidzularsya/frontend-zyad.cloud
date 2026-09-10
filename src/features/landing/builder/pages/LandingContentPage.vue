<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import LandingPagePicker from '@/features/landing/builder/components/LandingPagePicker.vue'
import { usePageSelection } from '@/features/landing/builder/composables/usePageSelection'

/**
 * Content menu entry point. Switches by `page.builder`:
 * - `grapesjs` (default for new pages) → GrapesJS visual editor
 * - `sections` (frozen legacy) → the component-based section builder, which
 *   renders its own header + page picker, so we delegate to it wholesale.
 */

const props = defineProps<{
  title?: string
  description?: string
  mode?: 'workspace' | 'platform'
  parentRouteName?: string
}>()

const GrapesEditor = defineAsyncComponent(
  () => import('@/features/landing/builder/grapes/GrapesEditor.vue'),
)
const LegacySectionBuilderPage = defineAsyncComponent(() => import('./LandingBuilderPage.vue'))

const { pages, selectedPageId, errorMessage, loadPages } = usePageSelection()

onMounted(() => void loadPages())

const currentPage = computed(
  () => pages.value.find((page) => page.id === selectedPageId.value) ?? null,
)
const builder = computed(() => currentPage.value?.builder ?? null)
</script>

<template>
  <!-- Legacy section pages: the section builder owns its whole shell. -->
  <LegacySectionBuilderPage v-if="builder === 'sections'" v-bind="props" />

  <!-- GrapesJS pages + the loading / empty states. -->
  <div v-else class="flex flex-col gap-4">
    <PageHeader :title="title || 'Content'" :description="description" />

    <div
      class="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
    >
      <div class="min-w-[220px] flex-1">
        <LandingPagePicker v-model="selectedPageId" :pages="pages" />
      </div>
    </div>

    <p v-if="errorMessage" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ errorMessage }}
    </p>

    <div
      v-if="builder === 'grapesjs' && selectedPageId"
      class="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800"
      style="height: calc(100vh - 240px); min-height: 520px"
    >
      <GrapesEditor :key="selectedPageId" :page-id="selectedPageId" />
    </div>
    <p
      v-else-if="!pages.length"
      class="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700"
    >
      Belum ada landing page. Buat halaman baru di menu Pages terlebih dahulu.
    </p>
    <p
      v-else
      class="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700"
    >
      Pilih landing page untuk mulai menyunting.
    </p>
  </div>
</template>
