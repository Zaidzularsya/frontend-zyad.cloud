<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  Layers3,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { landingApi } from '@/features/landing/shared/api/landing.api'
import type { LandingPage, SectionTemplate } from '@/features/landing/shared/types/landing.types'

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    mode?: 'workspace' | 'platform'
    parentRouteName?: string
  }>(),
  {
    title: 'Landing Templates',
    description: 'Kelola page template dan master section template landing page.',
    mode: 'workspace',
    parentRouteName: 'landing-pages',
  },
)

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const errorMessage = ref('')
const search = ref('')
const selectedSlug = ref('')
const pageTemplates = ref<LandingPage[]>([])
const sectionTemplates = ref<SectionTemplate[]>([])

const filteredPageTemplates = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return pageTemplates.value.filter((page) => {
    if (!keyword) return true
    return [page.name, page.title, page.slug, page.page_type]
      .join(' ')
      .toLowerCase()
      .includes(keyword)
  })
})

const sectionTemplatesBySlug = computed(() => {
  const groups = new Map<string, SectionTemplate[]>()
  for (const template of sectionTemplates.value) {
    const slug = sectionTemplateSlug(template)
    if (!slug) continue
    groups.set(slug, [...(groups.get(slug) ?? []), template])
  }
  for (const [slug, items] of groups.entries()) {
    groups.set(
      slug,
      [...items].sort((a, b) => sectionSortOrder(a) - sectionSortOrder(b)),
    )
  }
  return groups
})

const selectedPageTemplate = computed(() =>
  pageTemplates.value.find((page) => page.slug === selectedSlug.value),
)

const selectedSectionTemplates = computed(() =>
  selectedSlug.value ? (sectionTemplatesBySlug.value.get(selectedSlug.value) ?? []) : [],
)

const totalMappedSections = computed(() =>
  pageTemplates.value.reduce(
    (total, page) => total + (sectionTemplatesBySlug.value.get(page.slug)?.length ?? 0),
    0,
  ),
)

onMounted(() => {
  void loadTemplates()
})

async function loadTemplates() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [pagesResponse, sectionsResponse] = await Promise.all([
      landingApi.getTemplatePages({ per_page: 100 }),
      landingApi.getTemplates({ per_page: 500 }),
    ])
    pageTemplates.value = pagesResponse.data
    sectionTemplates.value = sectionsResponse.data
    selectedSlug.value = selectedSlug.value || pagesResponse.data[0]?.slug || ''
  } catch (error) {
    console.error('LandingTemplatesManagementPage: failed to load templates', error)
    errorMessage.value = 'Gagal memuat katalog template landing page.'
  } finally {
    loading.value = false
  }
}

function previewPageTemplate(page: LandingPage) {
  const resolved = router.resolve({
    name: 'landing-preview',
    params: { slug: page.slug },
    query: {
      mode: 'template',
      pageId: page.id,
      returnTo: route.fullPath,
    },
  })
  window.open(resolved.href, '_blank', 'noopener,noreferrer')
}

function usePageTemplate(page: LandingPage) {
  void router.push({
    name: `${props.parentRouteName}-pages`,
    query: { template: page.slug },
  })
}

function pageDescription(page: LandingPage) {
  const metaDescription = page.seo?.meta_description
  return typeof metaDescription === 'string' && metaDescription.trim()
    ? metaDescription
    : page.title
}

function sectionTemplateSlug(template: SectionTemplate) {
  const metadata = metadataObject(template)
  return typeof metadata.templateSlug === 'string' ? metadata.templateSlug : ''
}

function sectionTemplateKey(template: SectionTemplate) {
  const metadata = metadataObject(template)
  return typeof metadata.sectionKey === 'string' ? metadata.sectionKey : template.id
}

function sectionSortOrder(template: SectionTemplate) {
  const raw = template.style?.template
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'sortOrder' in raw) {
    const value = Number(raw.sortOrder)
    return Number.isFinite(value) ? value : 0
  }
  return 0
}

function sectionVariant(template: SectionTemplate) {
  const variant = template.style?.variant
  return typeof variant === 'string' ? variant : 'default'
}

function metadataObject(template: SectionTemplate) {
  const metadata = template.content?.metadata
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {}
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="props.title" :description="props.description">
      <div class="flex flex-wrap gap-2">
        <BaseButton variant="secondary" :disabled="loading" @click="loadTemplates">
          <RefreshCw class="size-4" :class="{ 'animate-spin': loading }" />
          Refresh
        </BaseButton>
        <BaseButton variant="outline" @click="router.push({ name: props.parentRouteName })">
          <ArrowLeft class="size-4" />
          Back
        </BaseButton>
      </div>
    </PageHeader>

    <div
      v-if="errorMessage"
      class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
    >
      {{ errorMessage }}
    </div>

    <section
      class="overflow-hidden rounded-[1.75rem] border bg-gray-950 text-white shadow-sm dark:border-gray-800"
    >
      <div class="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
        <div>
          <p
            class="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-brand-200"
          >
            <Sparkles class="size-4" />
            Template system
          </p>
          <h2 class="mt-4 max-w-3xl text-3xl font-black tracking-tight md:text-5xl">
            Page templates connected to master section templates.
          </h2>
          <p class="mt-4 max-w-2xl text-sm leading-6 text-gray-300">
            Katalog ini membaca `landing_pages` untuk template page dan `landing_section_templates`
            untuk master section yang akan di-instantiate ke draft.
          </p>
        </div>
        <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p class="text-xs font-bold uppercase text-white/50">Page templates</p>
            <p class="mt-2 text-3xl font-black">{{ pageTemplates.length }}</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p class="text-xs font-bold uppercase text-white/50">Section masters</p>
            <p class="mt-2 text-3xl font-black">{{ sectionTemplates.length }}</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p class="text-xs font-bold uppercase text-white/50">Mapped sections</p>
            <p class="mt-2 text-3xl font-black">{{ totalMappedSections }}</p>
          </div>
        </div>
      </div>
    </section>

    <div v-if="loading" class="grid min-h-[420px] place-items-center rounded-3xl border">
      <Loader2 class="size-8 animate-spin text-brand-500" />
    </div>

    <div v-else class="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_420px]">
      <section
        class="rounded-3xl border bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950"
      >
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 class="text-lg font-black text-gray-900 dark:text-white">Template Pages</h3>
            <p class="text-sm text-gray-500">Source: `landing_pages` dengan `is_template=true`.</p>
          </div>
          <label
            class="flex items-center gap-2 rounded-2xl border bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900"
          >
            <Search class="size-4 text-gray-400" />
            <input
              v-model="search"
              type="search"
              placeholder="Search page templates..."
              class="w-full bg-transparent text-sm outline-none"
            />
          </label>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <article
            v-for="page in filteredPageTemplates"
            :key="page.id"
            class="group rounded-3xl border p-4 transition hover:-translate-y-1 hover:border-brand-300 hover:shadow-xl dark:border-gray-800"
            :class="
              selectedSlug === page.slug
                ? 'border-brand-400 bg-brand-50/60 dark:bg-brand-950/20'
                : 'bg-white dark:bg-gray-950'
            "
          >
            <button class="block w-full text-left" @click="selectedSlug = page.slug">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs font-black uppercase tracking-wide text-brand-600">
                    {{ page.page_type.replaceAll('_', ' ') }}
                  </p>
                  <h4 class="mt-2 text-base font-black text-gray-900 dark:text-white">
                    {{ page.name }}
                  </h4>
                  <p class="mt-1 text-xs text-gray-500">/{{ page.slug }}</p>
                </div>
                <span
                  class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                  {{ sectionTemplatesBySlug.get(page.slug)?.length ?? 0 }} sections
                </span>
              </div>
              <p class="mt-4 line-clamp-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                {{ pageDescription(page) }}
              </p>
            </button>
            <div class="mt-4 grid grid-cols-2 gap-2">
              <BaseButton type="button" variant="secondary" @click="previewPageTemplate(page)">
                <Eye class="size-4" />
                Preview
              </BaseButton>
              <BaseButton type="button" @click="usePageTemplate(page)">
                Use
                <ArrowRight class="size-4" />
              </BaseButton>
            </div>
          </article>
        </div>
      </section>

      <aside
        class="rounded-3xl border bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950"
      >
        <div class="flex items-start gap-3">
          <span class="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <Layers3 class="size-5" />
          </span>
          <div>
            <h3 class="font-black text-gray-900 dark:text-white">
              {{ selectedPageTemplate?.name || 'Section Templates' }}
            </h3>
            <p class="mt-1 text-sm text-gray-500">Source: `landing_section_templates`.</p>
          </div>
        </div>

        <div class="mt-5 space-y-3">
          <article
            v-for="template in selectedSectionTemplates"
            :key="template.id"
            class="rounded-2xl border bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-black uppercase tracking-wide text-gray-400">
                  {{ sectionTemplateKey(template) }}
                </p>
                <h4 class="mt-1 font-bold text-gray-900 dark:text-white">{{ template.name }}</h4>
              </div>
              <span
                class="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-gray-600 ring-1 ring-gray-200 dark:bg-gray-950 dark:ring-gray-800"
              >
                {{ template.section_type }}
              </span>
            </div>
            <div class="mt-3 flex flex-wrap gap-2 text-xs">
              <span
                class="rounded-full bg-brand-50 px-2.5 py-1 font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300"
              >
                variant: {{ sectionVariant(template) }}
              </span>
              <span
                class="rounded-full bg-gray-100 px-2.5 py-1 font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                sort: {{ sectionSortOrder(template) }}
              </span>
            </div>
          </article>

          <div
            v-if="selectedSlug && selectedSectionTemplates.length === 0"
            class="rounded-2xl border border-dashed p-6 text-center text-sm text-gray-500"
          >
            Belum ada master section template untuk page template ini.
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
