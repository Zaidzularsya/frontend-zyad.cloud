<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Archive,
  ArrowUpDown,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Copy,
  Edit3,
  Eye,
  FileText,
  Globe2,
  Layers3,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { usePageSelection } from '@/features/landing/builder/composables/usePageSelection'
import { landingApi } from '@/features/landing/shared/api/landing.api'
import type {
  LandingPage,
  PageStatus,
  PageType,
  PageVisibility,
} from '@/features/landing/shared/types/landing.types'

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    mode?: 'workspace' | 'platform'
    parentRouteName?: string
  }>(),
  {
    title: 'Landing Pages',
    description: 'Kelola landing page, company profile, slug, SEO, dan status publikasi.',
    mode: 'workspace',
    parentRouteName: '',
  },
)

const route = useRoute()
const router = useRouter()

type SortOption = 'newest' | 'recently_updated' | 'title_asc' | 'status'
type ManageTab = 'details' | 'seo'
type PageFormState = {
  name: string
  title: string
  slug: string
  page_type: PageType
  visibility: PageVisibility
  locale: string
  timezone: string
  is_homepage: boolean
}

type SeoFormState = {
  meta_title: string
  meta_description: string
  canonical_url: string
  og_title: string
  og_description: string
  og_image_asset_id: string
}

const pages = ref<LandingPage[]>([])
const loading = ref(false)
const saving = ref(false)
const actionBusy = ref('')
const errorMessage = ref('')
const notice = ref('')

const search = ref('')
const statusFilter = ref<'all' | PageStatus>('all')
const pageTypeFilter = ref<'all' | PageType>('all')
const sortBy = ref<SortOption>('recently_updated')
const currentPage = ref(1)
const perPage = 10

const pagePanelOpen = ref(false)
const seoPanelOpen = ref(false)
const pagePanelRef = ref<HTMLElement | null>(null)
const seoPanelRef = ref<HTMLElement | null>(null)
const editingPageId = ref<string | null>(null)
const selectedSeoPage = ref<LandingPage | null>(null)
const managedPageId = ref<string | null>(null)
const manageTab = ref<ManageTab>('details')
const slugTouched = ref(false)

const { selectedPageId: contentSelectedPageId } = usePageSelection()

const pageForm = reactive<PageFormState>({
  name: '',
  title: '',
  slug: '',
  page_type: 'company_profile',
  visibility: 'public',
  locale: 'id-ID',
  timezone: 'Asia/Jakarta',
  is_homepage: false,
})

const seoForm = reactive<SeoFormState>({
  meta_title: '',
  meta_description: '',
  canonical_url: '',
  og_title: '',
  og_description: '',
  og_image_asset_id: '',
})

const formErrors = reactive<Partial<Record<keyof PageFormState, string>>>({})
const seoErrors = reactive<Partial<Record<keyof SeoFormState, string>>>({})

const manageTabs: Array<{ value: ManageTab; label: string; description: string }> = [
  {
    value: 'details',
    label: 'Page details',
    description: 'Data dasar, slug, visibility, dan homepage.',
  },
  {
    value: 'seo',
    label: 'SEO',
    description: 'Meta title, description, Open Graph, dan sitemap.',
  },
]

const statusOptions: Array<{ value: 'all' | PageStatus; label: string }> = [
  { value: 'all', label: 'Semua status' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'unpublished', label: 'Unpublished' },
  { value: 'archived', label: 'Archived' },
]

const pageTypeOptions: Array<{ value: 'all' | PageType; label: string }> = [
  { value: 'all', label: 'Semua layout' },
  { value: 'homepage', label: 'Homepage' },
  { value: 'company_profile', label: 'Company Profile' },
  { value: 'product_service', label: 'Product / Service' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'contact', label: 'Contact' },
  { value: 'lead_capture', label: 'Lead Capture' },
  { value: 'promo_event', label: 'Promo / Event' },
  { value: 'portfolio_case_study', label: 'Portfolio / Case Study' },
]

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: 'recently_updated', label: 'Recently updated' },
  { value: 'newest', label: 'Newest created' },
  { value: 'title_asc', label: 'Title A-Z' },
  { value: 'status', label: 'Status' },
]

const modeLabel = computed(() => (props.mode === 'platform' ? 'platform' : 'workspace'))
const formPanelOpen = computed(
  () => Boolean(managedPageId.value) || pagePanelOpen.value || seoPanelOpen.value,
)
const managedPage = computed(
  () => pages.value.find((page) => page.id === managedPageId.value) ?? null,
)
const filteredPages = computed(() => {
  const keyword = search.value.trim().toLowerCase()

  const matchingPages = pages.value.filter((page) => {
    const matchesStatus = statusFilter.value === 'all' || page.status === statusFilter.value
    const matchesType = pageTypeFilter.value === 'all' || page.page_type === pageTypeFilter.value
    const haystack = [page.title, page.name, page.slug, page.page_type, page.status]
      .join(' ')
      .toLowerCase()
    const matchesSearch = !keyword || haystack.includes(keyword)
    return matchesStatus && matchesType && matchesSearch
  })

  return [...matchingPages].sort((a, b) => {
    if (sortBy.value === 'newest') return dateValue(b.created_at) - dateValue(a.created_at)
    if (sortBy.value === 'title_asc') return displayTitle(a).localeCompare(displayTitle(b))
    if (sortBy.value === 'status') return a.status.localeCompare(b.status)
    return dateValue(b.updated_at) - dateValue(a.updated_at)
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredPages.value.length / perPage)))
const paginatedPages = computed(() => {
  const start = (currentPage.value - 1) * perPage
  return filteredPages.value.slice(start, start + perPage)
})

const stats = computed(() => {
  const now = Date.now()
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000

  return {
    total: pages.value.length,
    published: pages.value.filter((page) => page.status === 'published').length,
    draft: pages.value.filter((page) => page.status === 'draft').length,
    archived: pages.value.filter((page) => page.status === 'archived').length,
    recentlyUpdated: pages.value.filter((page) => now - dateValue(page.updated_at) <= sevenDaysMs)
      .length,
  }
})

const activeFilterCount = computed(
  () =>
    (search.value.trim() ? 1 : 0) +
    (statusFilter.value !== 'all' ? 1 : 0) +
    (pageTypeFilter.value !== 'all' ? 1 : 0) +
    (sortBy.value !== 'recently_updated' ? 1 : 0),
)

watch(
  () => pageForm.title,
  (title) => {
    if (!slugTouched.value && !editingPageId.value) pageForm.slug = makeSlug(title)
    if (!pageForm.name) pageForm.name = title
  },
)

watch([search, statusFilter, pageTypeFilter, sortBy], () => {
  currentPage.value = 1
})

watch(totalPages, (nextTotalPages) => {
  if (currentPage.value > nextTotalPages) currentPage.value = nextTotalPages
})

onMounted(async () => {
  await loadPages()
})

function dateValue(value?: string | null) {
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function getApiMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message ?? fallback
  }
  return fallback
}

function showNotice(message: string) {
  notice.value = message
  window.setTimeout(() => {
    if (notice.value === message) notice.value = ''
  }, 3000)
}

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function displayTitle(page: LandingPage) {
  return page.title || page.name || 'Untitled page'
}

function humanize(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatDate(value?: string | null) {
  if (!value) return 'Belum tersedia'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function seoScore(page: LandingPage) {
  const seo = page.seo ?? {}
  const openGraph = seo.open_graph as Record<string, unknown> | undefined
  let score = 0
  if (String(seo.meta_title ?? '').length >= 25) score += 30
  if (String(seo.meta_description ?? '').length >= 80) score += 30
  if (String(openGraph?.title ?? '').length > 0) score += 20
  if (String(openGraph?.image_asset_id ?? '').length > 0) score += 20
  return score
}

function seoLabel(page: LandingPage) {
  const score = seoScore(page)
  if (score >= 80) return 'Strong SEO'
  if (score >= 40) return 'Partial SEO'
  return 'Needs SEO'
}

function statusBadgeClass(status: PageStatus) {
  return {
    'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950 dark:text-emerald-300':
      status === 'published',
    'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950 dark:text-amber-300':
      status === 'draft',
    'bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950 dark:text-sky-300':
      status === 'unpublished',
    'bg-gray-100 text-gray-700 ring-gray-200 dark:bg-gray-800 dark:text-gray-300':
      status === 'archived',
  }
}

function clearPageErrors() {
  Object.keys(formErrors).forEach((key) => {
    delete formErrors[key as keyof PageFormState]
  })
}

function clearSeoErrors() {
  Object.keys(seoErrors).forEach((key) => {
    delete seoErrors[key as keyof SeoFormState]
  })
}

function resetFilters() {
  search.value = ''
  statusFilter.value = 'all'
  pageTypeFilter.value = 'all'
  sortBy.value = 'recently_updated'
  currentPage.value = 1
}

function changePage(nextPage: number) {
  if (nextPage < 1 || nextPage > totalPages.value) return
  currentPage.value = nextPage
}

function resetPageForm() {
  editingPageId.value = null
  slugTouched.value = false
  pageForm.name = ''
  pageForm.title = ''
  pageForm.slug = ''
  pageForm.page_type = 'company_profile'
  pageForm.visibility = 'public'
  pageForm.locale = 'id-ID'
  pageForm.timezone = 'Asia/Jakarta'
  pageForm.is_homepage = false
  clearPageErrors()
}

function fillPageForm(page: LandingPage) {
  editingPageId.value = page.id
  slugTouched.value = true
  pageForm.name = page.name
  pageForm.title = page.title
  pageForm.slug = page.slug
  pageForm.page_type = page.page_type
  pageForm.visibility = page.visibility
  pageForm.locale = page.locale || 'id-ID'
  pageForm.timezone = page.timezone || 'Asia/Jakarta'
  pageForm.is_homepage = page.is_homepage
  clearPageErrors()
}

function fillSeoForm(page: LandingPage) {
  const seo = page.seo ?? {}
  const openGraph = seo.open_graph as Record<string, unknown> | undefined
  selectedSeoPage.value = page
  seoForm.meta_title = String(seo.meta_title ?? page.title ?? '')
  seoForm.meta_description = String(seo.meta_description ?? '')
  seoForm.canonical_url = String(seo.canonical_url ?? '')
  seoForm.og_title = String(openGraph?.title ?? '')
  seoForm.og_description = String(openGraph?.description ?? '')
  seoForm.og_image_asset_id = String(openGraph?.image_asset_id ?? '')
  clearSeoErrors()
}

async function revealPanel(target: 'page' | 'seo') {
  await nextTick()
  const panel = target === 'page' ? pagePanelRef.value : seoPanelRef.value
  panel?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function openManagePage(page: LandingPage) {
  pagePanelOpen.value = false
  seoPanelOpen.value = false
  managedPageId.value = page.id
  manageTab.value = 'details'
  fillPageForm(page)
  fillSeoForm(page)
  await nextTick()
  document.getElementById('landing-page-manager')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

function closeManagePage() {
  managedPageId.value = null
  editingPageId.value = null
  selectedSeoPage.value = null
}

function openCreatePanel() {
  closeManagePage()
  resetPageForm()
  seoPanelOpen.value = false
  pagePanelOpen.value = true
  void revealPanel('page')
}

function openSeoPanel(page: LandingPage) {
  pagePanelOpen.value = false
  fillSeoForm(page)
  seoPanelOpen.value = true
  void revealPanel('seo')
}

function goToContent(page: LandingPage) {
  contentSelectedPageId.value = page.id
  if (props.parentRouteName) {
    router.push({ name: `${props.parentRouteName}-content` })
  }
}

function validatePageForm() {
  clearPageErrors()
  if (!pageForm.name.trim()) formErrors.name = 'Name wajib diisi.'
  if (!pageForm.title.trim()) formErrors.title = 'Title wajib diisi.'
  if (!pageForm.slug.trim()) formErrors.slug = 'Slug wajib diisi.'
  if (pageForm.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pageForm.slug)) {
    formErrors.slug = 'Slug hanya boleh lowercase, angka, dan tanda hubung.'
  }
  if (!pageForm.page_type) formErrors.page_type = 'Layout wajib dipilih.'
  if (!pageForm.visibility) formErrors.visibility = 'Visibility wajib dipilih.'
  return Object.keys(formErrors).length === 0
}

function validateSeoForm() {
  clearSeoErrors()
  if (seoForm.canonical_url.trim()) {
    try {
      new URL(seoForm.canonical_url)
    } catch {
      seoErrors.canonical_url = 'Canonical URL harus berupa URL valid.'
    }
  }
  return Object.keys(seoErrors).length === 0
}

async function loadPages() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await landingApi.getPages({ per_page: 100, is_template: false })
    const tenantPages = response.data.filter((page) => !page.is_template)
    pages.value = tenantPages
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal memuat daftar landing page.')
  } finally {
    loading.value = false
  }
}

function previewDraft(page: LandingPage) {
  const resolved = router.resolve({
    name: 'landing-preview',
    params: { slug: page.slug },
    query: {
      mode: 'draft',
      pageId: page.id,
      returnTo: route.fullPath,
    },
  })
  window.open(resolved.href, '_blank', 'noopener,noreferrer')
}

async function savePage() {
  if (!validatePageForm()) return

  saving.value = true
  errorMessage.value = ''
  try {
    const payload = {
      name: pageForm.name.trim(),
      title: pageForm.title.trim(),
      slug: pageForm.slug.trim(),
      page_type: pageForm.page_type,
      visibility: pageForm.visibility,
      locale: pageForm.locale.trim() || 'id-ID',
      timezone: pageForm.timezone.trim() || 'Asia/Jakarta',
      is_homepage: pageForm.page_type === 'homepage' || pageForm.is_homepage,
      is_template: false,
    }

    if (editingPageId.value) {
      await landingApi.updatePage(editingPageId.value, payload)
      showNotice('Landing page berhasil diperbarui.')
      pagePanelOpen.value = false
      await loadPages()
    } else {
      // New pages always start on the GrapesJS visual builder. Its own
      // starter picker (Kosong/SaaS/Company/Pricing/Portfolio/Event) opens
      // automatically for an empty document, so pick a starting point there
      // instead of browsing a separate template catalog here.
      const created = await landingApi.createPage({ ...payload, builder: 'grapesjs' })
      showNotice('Landing page berhasil dibuat.')
      pagePanelOpen.value = false
      await loadPages()
      goToContent(created.data)
    }
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menyimpan landing page.')
  } finally {
    saving.value = false
  }
}

async function saveSeo() {
  if (!selectedSeoPage.value || !validateSeoForm()) return

  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.updateSEO(selectedSeoPage.value.id, {
      meta_title: seoForm.meta_title.trim(),
      meta_description: seoForm.meta_description.trim(),
      meta_keywords: [],
      canonical_url: seoForm.canonical_url.trim() || null,
      robots: {
        index: true,
        follow: true,
      },
      open_graph: {
        title: seoForm.og_title.trim(),
        description: seoForm.og_description.trim(),
        image_asset_id: seoForm.og_image_asset_id.trim(),
      },
      twitter_card: 'summary_large_image',
      schema_markup: {},
      sitemap: {
        included: true,
        priority: selectedSeoPage.value.is_homepage ? 1 : 0.8,
      },
    })
    seoPanelOpen.value = false
    showNotice('SEO landing page berhasil diperbarui.')
    await loadPages()
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menyimpan SEO landing page.')
  } finally {
    saving.value = false
  }
}

async function runPageAction(
  page: LandingPage,
  action: 'publish' | 'unpublish' | 'archive' | 'restore' | 'delete' | 'duplicate',
) {
  const copy = {
    publish: `Publish "${displayTitle(page)}"?`,
    unpublish: `Unpublish "${displayTitle(page)}"?`,
    archive: `Archive "${displayTitle(page)}"?`,
    restore: `Restore "${displayTitle(page)}" ke draft?`,
    delete: `Hapus "${displayTitle(page)}"? Aksi ini tidak bisa dibatalkan dari halaman ini.`,
    duplicate: `Duplicate "${displayTitle(page)}" sebagai draft baru?`,
  }

  if (!window.confirm(copy[action])) return

  actionBusy.value = `${action}:${page.id}`
  errorMessage.value = ''
  try {
    if (action === 'publish') await landingApi.publishPage(page.id)
    if (action === 'unpublish') await landingApi.unpublishPage(page.id)
    if (action === 'archive') await landingApi.archivePage(page.id)
    if (action === 'restore') await landingApi.restorePage(page.id)
    if (action === 'delete') await landingApi.deletePage(page.id)
    if (action === 'duplicate') {
      await landingApi.duplicatePage(page.id, {
        name: `${page.name || displayTitle(page)} Copy`,
        slug: `${page.slug}-copy-${Date.now().toString(36)}`,
        include_forms: true,
      })
    }

    showNotice('Aksi landing page berhasil dijalankan.')
    await loadPages()
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Aksi landing page gagal dijalankan.')
  } finally {
    actionBusy.value = ''
  }
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="title" :description="description">
      <div class="flex flex-wrap items-center gap-2">
        <BaseButton @click="openCreatePanel">
          <Plus class="size-4" />
          Create Page
        </BaseButton>
      </div>
    </PageHeader>

    <div
      v-if="notice"
      class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
    >
      {{ notice }}
    </div>

    <div
      v-if="errorMessage"
      class="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200 sm:flex-row sm:items-center sm:justify-between"
    >
      <span>{{ errorMessage }}</span>
      <button class="font-semibold text-red-700 underline dark:text-red-200" @click="loadPages">
        Coba lagi
      </button>
    </div>

    <section
      v-if="managedPage"
      id="landing-page-manager"
      class="overflow-hidden rounded-[1.75rem] border bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950"
    >
      <div class="border-b bg-gray-950 px-5 py-6 text-white sm:px-7">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div class="max-w-3xl">
            <button
              type="button"
              class="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80 transition hover:bg-white/15"
              @click="closeManagePage"
            >
              <ArrowLeft class="size-3.5" />
              Back to pages
            </button>
            <p class="text-xs font-black uppercase tracking-wide text-brand-200">
              Kelola landing page
            </p>
            <h2 class="mt-2 text-3xl font-black tracking-tight">
              {{ displayTitle(managedPage) }}
            </h2>
            <p class="mt-2 break-all text-sm text-white/60">/{{ managedPage.slug }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <BaseButton type="button" variant="secondary" @click="previewDraft(managedPage)">
              <Eye class="size-4" />
              Preview
            </BaseButton>
            <BaseButton
              v-if="managedPage.status !== 'published'"
              type="button"
              :disabled="actionBusy === `publish:${managedPage.id}`"
              @click="runPageAction(managedPage, 'publish')"
            >
              Publish
            </BaseButton>
            <BaseButton
              v-else
              type="button"
              variant="secondary"
              :disabled="actionBusy === `unpublish:${managedPage.id}`"
              @click="runPageAction(managedPage, 'unpublish')"
            >
              Unpublish
            </BaseButton>
          </div>
        </div>

        <div class="mt-6 grid gap-3 md:grid-cols-2">
          <button
            v-for="tab in manageTabs"
            :key="tab.value"
            type="button"
            class="rounded-2xl border px-4 py-3 text-left transition"
            :class="
              manageTab === tab.value
                ? 'border-white bg-white text-gray-950 shadow-lg'
                : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
            "
            @click="manageTab = tab.value"
          >
            <span class="text-sm font-black">{{ tab.label }}</span>
            <span class="mt-1 block text-xs opacity-65">{{ tab.description }}</span>
          </button>
        </div>
      </div>

      <div class="p-5 sm:p-7">
        <form v-if="manageTab === 'details'" class="space-y-5" @submit.prevent="savePage">
          <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div class="space-y-5">
              <section class="rounded-2xl border p-5 dark:border-gray-800">
                <h3 class="font-black text-gray-900 dark:text-gray-100">Page identity</h3>
                <p class="mt-1 text-sm text-gray-500">
                  Update nama internal, title publik, dan slug URL tanpa keluar dari konteks page.
                </p>
                <div class="mt-5 grid gap-4">
                  <label class="block text-sm font-medium">
                    Internal name
                    <input
                      v-model="pageForm.name"
                      class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
                    />
                    <span v-if="formErrors.name" class="mt-1 block text-xs text-red-600">
                      {{ formErrors.name }}
                    </span>
                  </label>
                  <label class="block text-sm font-medium">
                    Page title
                    <input
                      v-model="pageForm.title"
                      class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
                    />
                    <span v-if="formErrors.title" class="mt-1 block text-xs text-red-600">
                      {{ formErrors.title }}
                    </span>
                  </label>
                  <label class="block text-sm font-medium">
                    Slug
                    <input
                      v-model="pageForm.slug"
                      class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
                      @input="slugTouched = true"
                    />
                    <span v-if="formErrors.slug" class="mt-1 block text-xs text-red-600">
                      {{ formErrors.slug }}
                    </span>
                  </label>
                </div>
              </section>

              <section class="rounded-2xl border p-5 dark:border-gray-800">
                <h3 class="font-black text-gray-900 dark:text-gray-100">Behavior</h3>
                <div class="mt-5 grid gap-4 md:grid-cols-2">
                  <label class="block text-sm font-medium">
                    Layout / type
                    <select
                      v-model="pageForm.page_type"
                      class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
                    >
                      <option
                        v-for="option in pageTypeOptions.filter((option) => option.value !== 'all')"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </option>
                    </select>
                  </label>
                  <label class="block text-sm font-medium">
                    Visibility
                    <select
                      v-model="pageForm.visibility"
                      class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                      <option value="password_protected">Password protected</option>
                    </select>
                  </label>
                  <label class="block text-sm font-medium">
                    Locale
                    <input
                      v-model="pageForm.locale"
                      class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
                    />
                  </label>
                  <label class="block text-sm font-medium">
                    Timezone
                    <input
                      v-model="pageForm.timezone"
                      class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
                    />
                  </label>
                </div>
                <label
                  class="mt-5 flex items-start gap-3 rounded-xl bg-gray-50 p-3 text-sm dark:bg-gray-900"
                >
                  <input v-model="pageForm.is_homepage" type="checkbox" class="mt-1" />
                  <span>
                    <span class="block font-semibold">Set as homepage</span>
                    <span class="text-gray-500">Jadikan page ini halaman utama workspace.</span>
                  </span>
                </label>
              </section>
            </div>

            <aside
              class="h-fit rounded-2xl border bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <p class="text-xs font-black uppercase tracking-wide text-gray-500">Current state</p>
              <div class="mt-4 space-y-3 text-sm">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-gray-500">Status</span>
                  <span
                    class="rounded-full px-2.5 py-1 text-xs font-bold ring-1"
                    :class="statusBadgeClass(managedPage.status)"
                  >
                    {{ humanize(managedPage.status) }}
                  </span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-gray-500">Sections</span>
                  <button
                    type="button"
                    class="font-semibold text-brand-600 hover:text-brand-700"
                    @click="goToContent(managedPage)"
                  >
                    Edit content
                  </button>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-gray-500">SEO score</span>
                  <strong>{{ seoScore(managedPage) }}%</strong>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-gray-500">Updated</span>
                  <strong>{{ formatDate(managedPage.updated_at) }}</strong>
                </div>
              </div>
              <BaseButton class="mt-5 w-full" type="submit" :disabled="saving">
                <CheckCircle2 class="size-4" />
                {{ saving ? 'Saving...' : 'Save page details' }}
              </BaseButton>
            </aside>
          </div>
        </form>

        <form v-else class="space-y-4" @submit.prevent="saveSeo">
          <section class="rounded-2xl border p-5 dark:border-gray-800">
            <h3 class="font-black text-gray-900 dark:text-gray-100">SEO settings</h3>
            <p class="mt-1 text-sm text-gray-500">
              Metadata ini dipakai untuk crawler, share preview, dan sitemap.
            </p>
            <div class="mt-5 grid gap-4">
              <label class="block text-sm font-medium">
                Meta title
                <input
                  v-model="seoForm.meta_title"
                  class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
                />
              </label>
              <label class="block text-sm font-medium">
                Meta description
                <textarea
                  v-model="seoForm.meta_description"
                  rows="3"
                  class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
                ></textarea>
              </label>
              <div class="grid gap-4 md:grid-cols-2">
                <label class="block text-sm font-medium">
                  Canonical URL
                  <input
                    v-model="seoForm.canonical_url"
                    class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
                    placeholder="https://example.com/page"
                  />
                  <span v-if="seoErrors.canonical_url" class="mt-1 block text-xs text-red-600">
                    {{ seoErrors.canonical_url }}
                  </span>
                </label>
                <label class="block text-sm font-medium">
                  OG image asset ID
                  <input
                    v-model="seoForm.og_image_asset_id"
                    class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
                  />
                </label>
              </div>
              <div class="grid gap-4 md:grid-cols-2">
                <label class="block text-sm font-medium">
                  Open Graph title
                  <input
                    v-model="seoForm.og_title"
                    class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
                  />
                </label>
                <label class="block text-sm font-medium">
                  Open Graph description
                  <textarea
                    v-model="seoForm.og_description"
                    rows="2"
                    class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
                  ></textarea>
                </label>
              </div>
            </div>
            <div class="mt-5 flex justify-end">
              <BaseButton type="submit" :disabled="saving">
                <CheckCircle2 class="size-4" />
                {{ saving ? 'Saving...' : 'Save SEO' }}
              </BaseButton>
            </div>
          </section>
        </form>
      </div>
    </section>

    <div v-if="!formPanelOpen" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <BaseCard class="!p-4">
        <div class="flex items-center gap-3">
          <span class="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <FileText class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">Total pages</p>
            <p class="text-2xl font-bold">{{ stats.total }}</p>
          </div>
        </div>
      </BaseCard>
      <BaseCard class="!p-4">
        <div class="flex items-center gap-3">
          <span class="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <Globe2 class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">Published</p>
            <p class="text-2xl font-bold">{{ stats.published }}</p>
          </div>
        </div>
      </BaseCard>
      <BaseCard class="!p-4">
        <div class="flex items-center gap-3">
          <span class="grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <Edit3 class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">Draft</p>
            <p class="text-2xl font-bold">{{ stats.draft }}</p>
          </div>
        </div>
      </BaseCard>
      <BaseCard class="!p-4">
        <div class="flex items-center gap-3">
          <span class="grid size-11 place-items-center rounded-xl bg-gray-100 text-gray-600">
            <Archive class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">Archived</p>
            <p class="text-2xl font-bold">{{ stats.archived }}</p>
          </div>
        </div>
      </BaseCard>
      <BaseCard class="!p-4">
        <div class="flex items-center gap-3">
          <span class="grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-600">
            <RefreshCw class="size-5" />
          </span>
          <div>
            <p class="text-sm text-gray-500">Updated 7 hari</p>
            <p class="text-2xl font-bold">{{ stats.recentlyUpdated }}</p>
          </div>
        </div>
      </BaseCard>
    </div>

    <BaseCard v-if="!formPanelOpen" class="!p-0">
      <div class="border-b p-5 dark:border-gray-800">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <label class="relative w-full xl:max-w-md">
            <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="search"
              type="search"
              placeholder="Cari title, slug, layout, atau status..."
              class="w-full rounded-lg border bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
            />
          </label>

          <div class="grid gap-3 sm:grid-cols-3 xl:flex xl:items-center">
            <select
              v-model="statusFilter"
              class="rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
            >
              <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <select
              v-model="pageTypeFilter"
              class="rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
            >
              <option v-for="option in pageTypeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <select
              v-model="sortBy"
              class="rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
            >
              <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
        </div>

        <div
          class="mt-4 flex flex-col gap-3 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between"
        >
          <p>
            Menampilkan {{ paginatedPages.length }} dari {{ filteredPages.length }} hasil di
            {{ modeLabel }}.
          </p>
          <button
            class="inline-flex items-center gap-2 font-semibold text-brand-600 disabled:cursor-not-allowed disabled:text-gray-400"
            :disabled="activeFilterCount === 0"
            @click="resetFilters"
          >
            <ArrowUpDown class="size-4" />
            Reset filters
          </button>
        </div>
      </div>

      <div v-if="loading" class="space-y-3 p-5">
        <div v-for="index in 5" :key="index" class="rounded-xl border p-4 dark:border-gray-800">
          <div class="h-4 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-gray-800"></div>
          <div class="mt-3 h-3 w-2/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800"></div>
          <div class="mt-4 h-8 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800"></div>
        </div>
      </div>

      <div
        v-else-if="!errorMessage && pages.length === 0"
        class="grid min-h-[420px] place-items-center p-8 text-center"
      >
        <div class="max-w-md">
          <span
            class="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"
          >
            <Sparkles class="size-7" />
          </span>
          <h2 class="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
            No landing pages yet
          </h2>
          <p class="mt-2 text-sm text-gray-500">
            Buat reusable company profile, SaaS landing, atau product page pertama untuk mulai
            menyusun website builder workspace ini.
          </p>
          <BaseButton class="mt-5" @click="openCreatePanel">
            <Plus class="size-4" />
            Create First Page
          </BaseButton>
        </div>
      </div>

      <div
        v-else-if="!errorMessage && filteredPages.length === 0"
        class="grid min-h-[320px] place-items-center p-8 text-center"
      >
        <div class="max-w-md">
          <span
            class="mx-auto grid size-14 place-items-center rounded-2xl bg-gray-100 text-gray-600"
          >
            <Search class="size-7" />
          </span>
          <h2 class="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Tidak ada page yang cocok
          </h2>
          <p class="mt-2 text-sm text-gray-500">
            Coba ubah keyword, status, layout, atau reset filter untuk melihat semua landing page.
          </p>
          <BaseButton class="mt-5" variant="secondary" @click="resetFilters"
            >Reset filters</BaseButton
          >
        </div>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead
            class="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-950"
          >
            <tr>
              <th class="px-5 py-3">Page</th>
              <th class="px-5 py-3">Status</th>
              <th class="px-5 py-3">Layout</th>
              <th class="px-5 py-3">Sections</th>
              <th class="px-5 py-3">SEO</th>
              <th class="px-5 py-3">Updated</th>
              <th class="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr
              v-for="page in paginatedPages"
              :key="page.id"
              class="align-top hover:bg-gray-50/80 dark:hover:bg-gray-900/60"
            >
              <td class="max-w-sm px-5 py-4">
                <div class="font-semibold text-gray-900 dark:text-gray-100">
                  {{ displayTitle(page) }}
                </div>
                <div class="mt-1 break-all text-xs text-gray-500">/{{ page.slug }}</div>
                <div v-if="page.is_homepage" class="mt-2 text-xs font-medium text-brand-600">
                  Homepage
                </div>
              </td>
              <td class="px-5 py-4">
                <span
                  class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
                  :class="statusBadgeClass(page.status)"
                >
                  {{ humanize(page.status) }}
                </span>
                <p v-if="page.published_at" class="mt-2 text-xs text-gray-500">
                  Published {{ formatDate(page.published_at) }}
                </p>
              </td>
              <td class="px-5 py-4">
                <p class="font-medium text-gray-800 dark:text-gray-200">
                  {{ humanize(page.page_type) }}
                </p>
                <p class="mt-1 text-xs text-gray-500">{{ humanize(page.visibility) }}</p>
              </td>
              <td class="px-5 py-4">
                <button
                  class="text-left font-semibold text-brand-600 hover:text-brand-700"
                  @click="goToContent(page)"
                >
                  Edit content
                </button>
                <p class="mt-1 text-xs text-gray-500">Kelola section di menu Content.</p>
              </td>
              <td class="px-5 py-4">
                <button
                  class="text-left font-semibold text-brand-600 hover:text-brand-700"
                  @click="openSeoPanel(page)"
                >
                  {{ seoLabel(page) }}
                </button>
                <p class="mt-1 text-xs text-gray-500">{{ seoScore(page) }}% complete</p>
              </td>
              <td class="px-5 py-4 text-gray-600 dark:text-gray-300">
                {{ formatDate(page.updated_at) }}
              </td>
              <td class="px-5 py-4">
                <div class="flex flex-wrap justify-end gap-2">
                  <button
                    class="inline-flex items-center gap-2 rounded-lg bg-gray-950 px-3 py-1.5 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-800 dark:bg-white dark:text-gray-950"
                    @click="openManagePage(page)"
                  >
                    <Layers3 class="size-3.5" />
                    Kelola
                  </button>
                  <button
                    class="rounded-lg border px-3 py-1.5 font-medium text-violet-700 hover:bg-violet-50 dark:border-gray-700"
                    @click="previewDraft(page)"
                  >
                    Preview
                  </button>
                  <button
                    v-if="page.status !== 'published'"
                    class="rounded-lg border px-3 py-1.5 font-medium text-emerald-700 hover:bg-emerald-50 dark:border-gray-700"
                    :disabled="actionBusy === `publish:${page.id}`"
                    @click="runPageAction(page, 'publish')"
                  >
                    Publish
                  </button>
                  <button
                    v-else
                    class="rounded-lg border px-3 py-1.5 font-medium text-sky-700 hover:bg-sky-50 dark:border-gray-700"
                    :disabled="actionBusy === `unpublish:${page.id}`"
                    @click="runPageAction(page, 'unpublish')"
                  >
                    Unpublish
                  </button>
                  <button
                    class="rounded-lg border px-3 py-1.5 font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    :disabled="actionBusy === `duplicate:${page.id}`"
                    @click="runPageAction(page, 'duplicate')"
                  >
                    <Copy class="inline size-3.5" />
                    Duplicate
                  </button>
                  <button
                    v-if="page.status === 'archived'"
                    class="rounded-lg border px-3 py-1.5 font-medium hover:bg-gray-50 dark:border-gray-700"
                    :disabled="actionBusy === `restore:${page.id}`"
                    @click="runPageAction(page, 'restore')"
                  >
                    Restore
                  </button>
                  <button
                    v-else
                    class="rounded-lg border px-3 py-1.5 font-medium hover:bg-gray-50 dark:border-gray-700"
                    :disabled="actionBusy === `archive:${page.id}`"
                    @click="runPageAction(page, 'archive')"
                  >
                    Archive
                  </button>
                  <button
                    class="rounded-lg border border-red-200 px-3 py-1.5 font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300"
                    :disabled="actionBusy === `delete:${page.id}`"
                    @click="runPageAction(page, 'delete')"
                  >
                    <Trash2 class="inline size-3.5" />
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="!loading && !errorMessage && filteredPages.length > 0"
        class="flex flex-col gap-3 border-t p-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-sm text-gray-500">
          Halaman {{ currentPage }} dari {{ totalPages }}. Total {{ filteredPages.length }} hasil.
        </p>

        <div class="flex items-center gap-2">
          <BaseButton
            variant="secondary"
            :disabled="currentPage <= 1"
            @click="changePage(currentPage - 1)"
          >
            Previous
          </BaseButton>
          <span
            class="rounded-lg border px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200"
          >
            {{ currentPage }}
          </span>
          <BaseButton
            variant="secondary"
            :disabled="currentPage >= totalPages"
            @click="changePage(currentPage + 1)"
          >
            Next
          </BaseButton>
        </div>
      </div>
    </BaseCard>

    <BaseCard
      v-if="pagePanelOpen"
      ref="pagePanelRef"
      class="border-brand-100 !p-5 dark:border-brand-900"
    >
      <form class="space-y-5" @submit.prevent="savePage">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-brand-600">
              {{ editingPageId ? 'Edit Page' : 'Create Page' }}
            </p>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {{ editingPageId ? 'Update landing page details' : 'Create a new landing page' }}
            </h2>
            <p v-if="!editingPageId" class="mt-1 text-sm text-gray-500">
              Halaman baru langsung dibuka di visual builder (Content) — pilih starter (Kosong,
              SaaS, Company profile, dll) di sana.
            </p>
          </div>
          <BaseButton type="button" variant="secondary" @click="pagePanelOpen = false">
            Close
          </BaseButton>
        </div>

        <section class="space-y-3">
          <label class="block text-sm font-medium">
            Page title
            <input
              v-model="pageForm.title"
              class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
              placeholder="Zyad Cloud Company Profile"
            />
            <span v-if="formErrors.title" class="mt-1 block text-xs text-red-600">{{
              formErrors.title
            }}</span>
          </label>
          <label class="block text-sm font-medium">
            Layout / type
            <select
              v-model="pageForm.page_type"
              class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
            >
              <option
                v-for="option in pageTypeOptions.filter((option) => option.value !== 'all')"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
        </section>

        <details
          class="group rounded-xl border p-3 dark:border-gray-800"
          :open="Boolean(editingPageId)"
        >
          <summary
            class="flex cursor-pointer select-none items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-300"
          >
            Advanced
            <ChevronDown class="size-4 text-gray-400 transition-transform group-open:rotate-180" />
          </summary>
          <div class="mt-3 space-y-3">
            <label class="block text-sm font-medium">
              Internal name
              <input
                v-model="pageForm.name"
                class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
                placeholder="Company profile main page"
              />
              <span v-if="formErrors.name" class="mt-1 block text-xs text-red-600">{{
                formErrors.name
              }}</span>
            </label>
            <label class="block text-sm font-medium">
              Slug
              <input
                v-model="pageForm.slug"
                class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
                placeholder="company-profile"
                @input="slugTouched = true"
              />
              <span v-if="formErrors.slug" class="mt-1 block text-xs text-red-600">{{
                formErrors.slug
              }}</span>
            </label>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="block text-sm font-medium">
                Visibility
                <select
                  v-model="pageForm.visibility"
                  class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="password_protected">Password protected</option>
                </select>
              </label>
              <label class="block text-sm font-medium">
                Locale
                <input
                  v-model="pageForm.locale"
                  class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
                />
              </label>
              <label class="block text-sm font-medium">
                Timezone
                <input
                  v-model="pageForm.timezone"
                  class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
                />
              </label>
            </div>
            <label
              class="flex items-start gap-3 rounded-xl border p-3 text-sm dark:border-gray-800"
            >
              <input v-model="pageForm.is_homepage" type="checkbox" class="mt-1" />
              <span>
                <span class="block font-medium">Set as homepage</span>
                <span class="text-gray-500"
                  >Backend tetap menyimpan halaman baru sebagai draft sampai dipublish.</span
                >
              </span>
            </label>
          </div>
        </details>

        <div class="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
          <BaseButton type="button" variant="secondary" @click="pagePanelOpen = false">
            Cancel
          </BaseButton>
          <BaseButton type="submit" :disabled="saving">
            <CheckCircle2 class="size-4" />
            {{ saving ? 'Saving...' : 'Save Page' }}
          </BaseButton>
        </div>
      </form>
    </BaseCard>

    <BaseCard
      v-if="seoPanelOpen"
      ref="seoPanelRef"
      class="border-brand-100 !p-5 dark:border-brand-900"
    >
      <form class="space-y-4" @submit.prevent="saveSeo">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-brand-600">SEO Settings</p>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {{ selectedSeoPage ? displayTitle(selectedSeoPage) : 'Landing page SEO' }}
            </h2>
            <p class="mt-1 text-sm text-gray-500">
              Update metadata yang dipakai backend lewat endpoint SEO landing page.
            </p>
          </div>
          <BaseButton type="button" variant="secondary" @click="seoPanelOpen = false">
            Close
          </BaseButton>
        </div>
        <label class="block text-sm font-medium">
          Meta title
          <input
            v-model="seoForm.meta_title"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
        <label class="block text-sm font-medium">
          Meta description
          <textarea
            v-model="seoForm.meta_description"
            rows="3"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          ></textarea>
        </label>
        <label class="block text-sm font-medium">
          Canonical URL
          <input
            v-model="seoForm.canonical_url"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
            placeholder="https://example.com/page"
          />
          <span v-if="seoErrors.canonical_url" class="mt-1 block text-xs text-red-600">
            {{ seoErrors.canonical_url }}
          </span>
        </label>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block text-sm font-medium">
            Open Graph title
            <input
              v-model="seoForm.og_title"
              class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
            />
          </label>
          <label class="block text-sm font-medium">
            OG image asset ID
            <input
              v-model="seoForm.og_image_asset_id"
              class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
            />
          </label>
        </div>
        <label class="block text-sm font-medium">
          Open Graph description
          <textarea
            v-model="seoForm.og_description"
            rows="2"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          ></textarea>
        </label>
        <div class="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
          <BaseButton type="button" variant="secondary" @click="seoPanelOpen = false">
            Cancel
          </BaseButton>
          <BaseButton type="submit" :disabled="saving">
            <CheckCircle2 class="size-4" />
            {{ saving ? 'Saving...' : 'Save SEO' }}
          </BaseButton>
        </div>
      </form>
    </BaseCard>
  </div>
</template>
