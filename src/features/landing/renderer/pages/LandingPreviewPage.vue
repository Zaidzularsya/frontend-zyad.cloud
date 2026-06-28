<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Loader2, Rocket, Sparkles } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import { http } from '@/lib/http'
import { landingApi } from '@/features/landing/shared/api/landing.api'
import LandingPageRenderer from '../components/LandingPageRenderer.vue'
import type { LandingPage, LandingSection } from '../../shared/types/landing.types'

type RawRecord = Record<string, unknown>

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const page = ref<LandingPage | null>(null)
const sections = ref<LandingSection[]>([])

const slug = computed(() => String(route.params.slug || ''))
const mode = computed(() => String(route.query.mode || 'template'))
const pageId = computed(() => String(route.query.pageId || ''))
const returnTo = computed(() => String(route.query.returnTo || '/app/landing-pages'))
const isAdminPreview = computed(() => Boolean(pageId.value))
const isDraftPreview = computed(() => mode.value === 'draft' && Boolean(pageId.value))
const isTemplatePreview = computed(() => mode.value === 'template')

onMounted(() => {
  void loadPreview()
})

async function loadPreview() {
  loading.value = true
  errorMessage.value = ''
  try {
    if (isAdminPreview.value) {
      await loadAdminPreview(pageId.value)
      return
    }

    if (isTemplatePreview.value) {
      const templateId = await resolveTemplateIdBySlug(slug.value)
      if (!templateId) {
        throw new Error('Template page id is required for template preview.')
      }
      await loadAdminPreview(templateId)
      return
    }

    const response = await http.get<{ data: RawRecord } | RawRecord>('/public/landing/resolve', {
      params: { slug: slug.value },
    })
    const result: RawRecord =
      (response.data as { data?: RawRecord }).data ?? (response.data as RawRecord)
    page.value = normalizePage(result, slug.value)
    sections.value = normalizeSections(resolveSectionsPayload(result))
  } catch (error) {
    console.error('LandingPreviewPage: failed to load preview', error)
    errorMessage.value = 'Preview tidak dapat dimuat. Pastikan template/page masih tersedia.'
  } finally {
    loading.value = false
  }
}

async function loadAdminPreview(id: string) {
  const [pageResponse, sectionResponse] = await Promise.all([
    landingApi.getPage(id),
    landingApi.getSections(id),
  ])
  page.value = pageResponse.data
  sections.value = sectionResponse.data
}

async function resolveTemplateIdBySlug(templateSlug: string) {
  if (!templateSlug) return ''
  const response = await landingApi.getTemplatePages({ per_page: 100 })
  return response.data.find((template) => template.slug === templateSlug)?.id ?? ''
}

function useThisTemplate() {
  void router.push({
    path: returnTo.value,
    query: { template: slug.value },
  })
}

async function publishDraft() {
  if (!pageId.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.publishPage(pageId.value)
    await loadPreview()
  } catch (error) {
    console.error('LandingPreviewPage: failed to publish', error)
    errorMessage.value = 'Gagal publish draft. Cek kembali section dan konfigurasi halaman.'
  } finally {
    saving.value = false
  }
}

function goBack() {
  void router.push(returnTo.value)
}

function resolveSectionsPayload(result: RawRecord): RawRecord[] {
  const directSections = pickArray(result, 'Sections', 'sections')
  if (directSections.length > 0) return directSections
  const snapshot = pickObject(result, 'Snapshot', 'snapshot')
  return pickArray(snapshot, 'sections', 'Sections')
}

function normalizePage(result: RawRecord, fallbackSlug: string): LandingPage {
  const rawPage = pickObject(result, 'Page', 'page')
  return {
    id: pickString(rawPage, 'id', 'ID'),
    name: pickString(rawPage, 'name', 'Name', 'title', 'Title'),
    title: pickString(rawPage, 'title', 'Title', 'name', 'Name'),
    slug: pickString(rawPage, 'slug', 'Slug') || fallbackSlug,
    page_type: 'campaign',
    status: 'published',
    visibility: 'public',
    locale: 'id-ID',
    timezone: 'Asia/Jakarta',
    is_homepage: false,
    is_template: isTemplatePreview.value,
    published_version: 1,
    created_at: '',
    updated_at: '',
    seo: pickObject(rawPage, 'seo', 'SEO'),
  }
}

function normalizeSections(rawSections: RawRecord[]): LandingSection[] {
  return rawSections.map((section, index) => ({
    id: pickString(section, 'id', 'ID') || `${index}`,
    key: pickString(section, 'key', 'Key', 'section_key', 'SectionKey'),
    type: pickString(section, 'type', 'Type', 'section_type', 'SectionType'),
    name: pickString(section, 'name', 'Name'),
    sort_order: pickNumber(section, 'sort_order', 'SortOrder') || index + 1,
    is_enabled: pickBoolean(section, ['is_enabled', 'IsEnabled'], true),
    content: pickObject(section, 'content', 'Content'),
    style: pickObject(section, 'style', 'Style'),
    created_at: pickString(section, 'created_at', 'CreatedAt'),
    updated_at: pickString(section, 'updated_at', 'UpdatedAt'),
    variant: pickString(section, 'variant', 'Variant') || undefined,
  }))
}

function pickString(record: RawRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value) return value
  }
  return ''
}

function pickNumber(record: RawRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number') return value
  }
  return 0
}

function pickBoolean(record: RawRecord, keys: string[], fallback: boolean) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'boolean') return value
  }
  return fallback
}

function pickObject(record: RawRecord, ...keys: string[]): RawRecord {
  for (const key of keys) {
    const value = record[key]
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as RawRecord
  }
  return {}
}

function pickArray(record: RawRecord, ...keys: string[]): RawRecord[] {
  for (const key of keys) {
    const value = record[key]
    if (Array.isArray(value)) return value as RawRecord[]
  }
  return []
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <div
      class="fixed left-0 right-0 top-0 z-50 border-b border-gray-200/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur"
    >
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <button
          class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
          @click="goBack"
        >
          <ArrowLeft class="size-4" />
          Back
        </button>
        <div class="min-w-0 text-center">
          <p class="truncate text-sm font-bold text-gray-900">
            {{ page?.title || 'Landing preview' }}
          </p>
          <p class="text-xs text-gray-500">
            {{ isDraftPreview ? 'Draft preview' : 'Template preview' }}
          </p>
        </div>
        <BaseButton v-if="isTemplatePreview" @click="useThisTemplate">
          <Sparkles class="size-4" />
          Use this template
        </BaseButton>
        <BaseButton v-else :disabled="saving" @click="publishDraft">
          <Loader2 v-if="saving" class="size-4 animate-spin" />
          <Rocket v-else class="size-4" />
          Publish
        </BaseButton>
      </div>
    </div>

    <div v-if="loading" class="flex min-h-screen items-center justify-center pt-20">
      <Loader2 class="size-8 animate-spin text-brand-500" />
    </div>
    <div v-else-if="errorMessage" class="flex min-h-screen items-center justify-center px-6 pt-20">
      <div class="max-w-md rounded-xl border bg-white p-6 text-center shadow-sm">
        <p class="font-semibold text-gray-900">Preview gagal dimuat</p>
        <p class="mt-2 text-sm text-gray-500">{{ errorMessage }}</p>
      </div>
    </div>
    <div v-else class="pt-16">
      <LandingPageRenderer v-if="page" :page="page" :sections="sections" />
    </div>
  </div>
</template>
