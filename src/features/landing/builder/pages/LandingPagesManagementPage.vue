<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Archive,
  ArrowUpDown,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  Edit3,
  Eye,
  FileText,
  Globe2,
  Layers3,
  Loader2,
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
type CreatePageMode = 'catalog' | 'customize' | 'custom'
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

// Read-only preview of what landingApi.createPageFromTemplate() will copy —
// content/style editing happens after creation via the Content menu's
// schema-driven form, not before creation.
type SectionDraft = {
  key: string
  type: string
  name: string
  sort_order: number
}

const templateThumbnailUrls = [
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
]

const pages = ref<LandingPage[]>([])
const templatePages = ref<LandingPage[]>([])
const loading = ref(false)
const templateCatalogLoading = ref(false)
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
const createPageMode = ref<CreatePageMode>('catalog')
const selectedTemplatePage = ref<LandingPage | null>(null)
const templateSearch = ref('')
const templateTypeFilter = ref<'all' | PageType>('all')
const sectionDrafts = ref<SectionDraft[]>([])
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
const templateCatalog = computed(() => {
  const keyword = templateSearch.value.trim().toLowerCase()
  return templatePages.value.filter((template) => {
    const matchesType =
      templateTypeFilter.value === 'all' || template.page_type === templateTypeFilter.value
    if (!matchesType) return false
    if (!keyword) return true
    return [template.name, template.title, template.slug, template.page_type]
      .join(' ')
      .toLowerCase()
      .includes(keyword)
  })
})

const templateTypeOptions = computed(() => {
  const values = Array.from(new Set(templatePages.value.map((template) => template.page_type)))
  return values.map((value) => ({
    value,
    label: humanize(value),
    count: templatePages.value.filter((template) => template.page_type === value).length,
  }))
})

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
  await applyTemplateFromRoute()
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

function templateThumbnail(template: LandingPage, index: number) {
  const imageFromSettings = template.settings?.thumbnail_url
  if (typeof imageFromSettings === 'string' && imageFromSettings.trim()) return imageFromSettings
  return templateThumbnailUrls[index % templateThumbnailUrls.length]
}

function templateDescription(template: LandingPage) {
  const metaDescription = template.seo?.meta_description
  if (typeof metaDescription === 'string' && metaDescription.trim()) return metaDescription
  return template.name || template.title || 'Template landing page siap pakai.'
}

function templateIndustry(template: LandingPage) {
  const templateSettings = template.settings?.template
  if (
    typeof templateSettings === 'object' &&
    templateSettings &&
    'industry' in templateSettings &&
    typeof templateSettings.industry === 'string'
  ) {
    return templateSettings.industry
  }
  return humanize(template.page_type)
}

function templateAudience(template: LandingPage) {
  const templateSettings = template.settings?.template
  if (
    typeof templateSettings === 'object' &&
    templateSettings &&
    'audience' in templateSettings &&
    typeof templateSettings.audience === 'string'
  ) {
    return templateSettings.audience
  }
  return 'Business team'
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
  createPageMode.value = 'catalog'
  selectedTemplatePage.value = null
  templateSearch.value = ''
  templateTypeFilter.value = 'all'
  sectionDrafts.value = []
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
  void loadTemplateCatalog()
  void revealPanel('page')
}

function showTemplateCatalog() {
  createPageMode.value = 'catalog'
  void loadTemplateCatalog()
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

async function loadTemplateCatalog() {
  if (templateCatalogLoading.value) return
  templateCatalogLoading.value = true
  errorMessage.value = ''
  try {
    const response = await landingApi.getTemplatePages({ per_page: 100 })
    templatePages.value = response.data
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal memuat katalog template.')
  } finally {
    templateCatalogLoading.value = false
  }
}

function previewTemplate(template: LandingPage) {
  const resolved = router.resolve({
    name: 'landing-preview',
    params: { slug: template.slug },
    query: {
      mode: 'template',
      pageId: template.id,
      returnTo: route.fullPath,
    },
  })
  window.open(resolved.href, '_blank', 'noopener,noreferrer')
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

async function useTemplate(template: LandingPage) {
  selectedTemplatePage.value = template
  createPageMode.value = 'customize'
  slugTouched.value = false
  pageForm.name = `${template.name} Draft`
  pageForm.title = template.title || template.name
  pageForm.slug = ''
  pageForm.page_type = template.page_type
  pageForm.visibility = 'public'
  pageForm.locale = template.locale || 'id-ID'
  pageForm.timezone = template.timezone || 'Asia/Jakarta'
  pageForm.is_homepage = false

  templateCatalogLoading.value = true
  errorMessage.value = ''
  try {
    const response = await landingApi.getSections(template.id)
    sectionDrafts.value = response.data.map((section, index) => ({
      key: section.key,
      type: section.type,
      name: section.name,
      sort_order: section.sort_order || (index + 1) * 10,
    }))
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal memuat preview section template.')
  } finally {
    templateCatalogLoading.value = false
  }
}

async function applyTemplateFromRoute() {
  const templateSlug = typeof route.query.template === 'string' ? route.query.template : ''
  if (!templateSlug) return

  pagePanelOpen.value = true
  await loadTemplateCatalog()
  const template = templatePages.value.find((item) => item.slug === templateSlug)
  if (template) await useTemplate(template)
  await router.replace({ path: route.path, query: {} })
  await revealPanel('page')
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
    } else if (createPageMode.value === 'customize' && selectedTemplatePage.value) {
      // Single call: backend copies sections, SEO, and (optionally) branding
      // override from the template page in one transaction-scoped operation.
      await landingApi.createPageFromTemplate({
        template_page_id: selectedTemplatePage.value.id,
        name: payload.name,
        title: payload.title,
        slug: payload.slug,
        visibility: payload.visibility,
        locale: payload.locale,
        timezone: payload.timezone,
        include_branding: true,
      })
      showNotice('Draft berhasil dibuat dari template.')
    } else {
      await landingApi.createPage(payload)
      showNotice('Landing page custom berhasil dibuat.')
    }

    pagePanelOpen.value = false
    await loadPages()
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

    <section
      v-if="pagePanelOpen && !editingPageId && createPageMode === 'catalog'"
      ref="pagePanelRef"
      class="overflow-hidden rounded-[1.75rem] border bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950"
    >
      <div class="border-b bg-gray-950 px-5 py-6 text-white sm:px-7 lg:px-8">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div class="max-w-3xl">
            <p
              class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand-200"
            >
              <Sparkles class="size-4" />
              Template catalog
            </p>
            <h2 class="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Choose a landing page template
            </h2>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-gray-300">
              Browse visual templates, preview the full page, then use one as the base for your
              draft. The content form appears only after a template is selected.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <BaseButton type="button" variant="secondary" @click="createPageMode = 'custom'">
              <Plus class="size-4" />
              Blank page
            </BaseButton>
            <BaseButton type="button" variant="outline" @click="pagePanelOpen = false">
              Close
            </BaseButton>
          </div>
        </div>

        <div class="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <label
            class="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3"
          >
            <Search class="size-5 text-gray-300" />
            <input
              v-model="templateSearch"
              type="search"
              placeholder="Search templates, industry, slug, or page type..."
              class="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </label>
          <select
            v-model="templateTypeFilter"
            class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white outline-none"
          >
            <option value="all" class="text-gray-900">All page types</option>
            <option
              v-for="option in templateTypeOptions"
              :key="option.value"
              :value="option.value"
              class="text-gray-900"
            >
              {{ option.label }} ({{ option.count }})
            </option>
          </select>
        </div>
      </div>

      <div class="space-y-6 bg-gray-50 p-5 dark:bg-gray-950 sm:p-7 lg:p-8">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">
              {{ templateCatalog.length }} templates available
            </h3>
            <p class="text-sm text-gray-500">
              Inspired by visual asset galleries: thumbnail first, actions appear naturally on
              hover.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-full px-3 py-1.5 text-xs font-semibold transition"
              :class="
                templateTypeFilter === 'all'
                  ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950'
                  : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:text-gray-950 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-800'
              "
              @click="templateTypeFilter = 'all'"
            >
              All
            </button>
            <button
              v-for="option in templateTypeOptions.slice(0, 6)"
              :key="option.value"
              type="button"
              class="rounded-full px-3 py-1.5 text-xs font-semibold transition"
              :class="
                templateTypeFilter === option.value
                  ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950'
                  : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:text-gray-950 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-800'
              "
              @click="templateTypeFilter = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div v-if="templateCatalogLoading" class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div
            v-for="index in 8"
            :key="index"
            class="h-80 animate-pulse rounded-3xl bg-white ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800"
          ></div>
        </div>

        <div
          v-else-if="templateCatalog.length > 0"
          class="columns-1 gap-5 md:columns-2 xl:columns-4"
        >
          <article
            v-for="(template, index) in templateCatalog"
            :key="template.id"
            class="group mb-5 break-inside-avoid overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-200 transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:ring-gray-300 dark:bg-gray-900 dark:ring-gray-800 dark:hover:ring-gray-700"
          >
            <div
              class="relative overflow-hidden"
              :class="
                index % 5 === 0 ? 'aspect-[4/5]' : index % 3 === 0 ? 'aspect-[1/1]' : 'aspect-[4/3]'
              "
            >
              <img
                :src="templateThumbnail(template, index)"
                :alt="template.name"
                class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div
                class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-90"
              ></div>
              <div class="absolute left-4 right-4 top-4 flex items-center justify-between gap-2">
                <span
                  class="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase text-gray-950"
                >
                  {{ templateIndustry(template) }}
                </span>
                <span
                  class="rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase text-white backdrop-blur"
                >
                  {{ humanize(template.page_type) }}
                </span>
              </div>
              <div class="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h4 class="line-clamp-2 text-lg font-black leading-tight">
                  {{ template.title || template.name }}
                </h4>
                <p class="mt-1 line-clamp-2 text-xs leading-relaxed text-white/75">
                  {{ templateDescription(template) }}
                </p>
              </div>
              <div
                class="absolute inset-x-4 bottom-4 flex translate-y-4 gap-2 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100"
              >
                <BaseButton
                  type="button"
                  variant="secondary"
                  class="flex-1"
                  @click="previewTemplate(template)"
                >
                  <Eye class="size-4" />
                  Preview
                </BaseButton>
                <BaseButton type="button" class="flex-1" @click="useTemplate(template)">
                  Use
                  <ArrowRight class="size-4" />
                </BaseButton>
              </div>
            </div>
            <div class="space-y-3 p-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h4 class="font-bold text-gray-900 dark:text-gray-100">{{ template.name }}</h4>
                  <p class="mt-1 text-xs text-gray-500">/{{ template.slug }}</p>
                </div>
                <span
                  class="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                >
                  Ready
                </span>
              </div>
              <p class="line-clamp-2 text-xs leading-relaxed text-gray-500">
                For {{ templateAudience(template) }}
              </p>
            </div>
          </article>
        </div>

        <div
          v-else
          class="rounded-3xl border border-dashed bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900"
        >
          <div
            class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800"
          >
            <Search class="size-6 text-gray-500" />
          </div>
          <h3 class="mt-4 text-lg font-bold text-gray-900 dark:text-gray-100">
            No templates found for this workspace
          </h3>
          <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">
            Template catalog reads from `landing_pages` where `is_template=true`. If seed already
            exists on the platform organization, refresh after the backend update is deployed.
          </p>
          <div class="mt-5 flex flex-wrap justify-center gap-2">
            <BaseButton type="button" variant="secondary" @click="loadTemplateCatalog">
              <RefreshCw class="size-4" />
              Reload catalog
            </BaseButton>
            <BaseButton type="button" @click="createPageMode = 'custom'">
              <Plus class="size-4" />
              Start blank page
            </BaseButton>
          </div>
        </div>
      </div>
    </section>

    <BaseCard
      v-if="pagePanelOpen && (editingPageId || createPageMode !== 'catalog')"
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
            <p class="mt-1 text-sm text-gray-500">
              Form ini tampil inline agar konteks list, status, dan section tetap terlihat.
            </p>
          </div>
          <BaseButton type="button" variant="secondary" @click="pagePanelOpen = false">
            Close
          </BaseButton>
        </div>

        <section v-if="!editingPageId" class="space-y-4">
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">Start from</h3>
            <p class="text-sm text-gray-500">
              Pilih template dari katalog seed, preview di tab baru, lalu isi basic info untuk
              membuat draft — section, SEO, dan branding template disalin sekaligus.
            </p>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              class="rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-800 dark:hover:border-brand-800 dark:hover:bg-brand-950/30"
              :class="
                createPageMode === 'catalog' || createPageMode === 'customize'
                  ? 'border-brand-500 bg-brand-50 shadow-sm dark:border-brand-700 dark:bg-brand-950/40'
                  : ''
              "
              @click="showTemplateCatalog"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Template catalog
                  </p>
                  <p class="mt-1 text-sm text-gray-500">
                    Gunakan template dari database landing page sebagai starting point tenant.
                  </p>
                </div>
                <span
                  class="rounded-full px-2.5 py-1 text-xs font-semibold text-brand-700 bg-brand-100 dark:bg-brand-950 dark:text-brand-300"
                >
                  Recommended
                </span>
              </div>
            </button>

            <button
              type="button"
              class="rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:hover:border-gray-700 dark:hover:bg-gray-900/60"
              :class="
                createPageMode === 'custom'
                  ? 'border-gray-400 bg-gray-100 shadow-sm dark:border-gray-600 dark:bg-gray-900'
                  : ''
              "
              @click="createPageMode = 'custom'"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">Blank page</p>
                  <p class="mt-1 text-sm text-gray-500">
                    Mulai dari page kosong, cocok kalau struktur dan kontennya ingin disusun manual.
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div
            v-if="createPageMode === 'catalog'"
            class="space-y-4 rounded-2xl border bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950"
          >
            <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-brand-600">
                  Template gallery
                </p>
                <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Pilih template landing page
                </h4>
              </div>
              <div
                class="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900"
              >
                <Search class="size-4 text-gray-400" />
                <input
                  v-model="templateSearch"
                  type="search"
                  placeholder="Cari nama, slug, atau layout..."
                  class="w-full min-w-56 bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            <div
              v-if="templateCatalogLoading"
              class="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900"
            >
              <Loader2 class="mx-auto mb-3 size-6 animate-spin text-brand-500" />
              Memuat katalog template...
            </div>

            <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <article
                v-for="(template, index) in templateCatalog"
                :key="template.id"
                class="group overflow-hidden rounded-2xl border bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900"
              >
                <div class="relative aspect-[16/10] overflow-hidden">
                  <img
                    :src="templateThumbnail(template, index)"
                    :alt="template.name"
                    class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div
                    class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"
                  ></div>
                  <div class="absolute left-4 right-4 top-4 flex items-center justify-between">
                    <span
                      class="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase text-gray-900"
                    >
                      {{ humanize(template.page_type) }}
                    </span>
                    <span
                      class="rounded-full bg-emerald-400/90 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-950"
                    >
                      Template
                    </span>
                  </div>
                  <div class="absolute bottom-4 left-4 right-4 text-white">
                    <h4 class="line-clamp-2 text-lg font-black leading-tight">
                      {{ template.title || template.name }}
                    </h4>
                    <p class="mt-1 line-clamp-2 text-xs text-white/75">
                      {{ templateDescription(template) }}
                    </p>
                  </div>
                </div>
                <div class="space-y-4 p-4">
                  <div>
                    <h4 class="font-semibold text-gray-900 dark:text-gray-100">
                      {{ template.name }}
                    </h4>
                    <p class="mt-1 text-xs text-gray-500">/{{ template.slug }}</p>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <BaseButton
                      type="button"
                      variant="secondary"
                      @click="previewTemplate(template)"
                    >
                      <Eye class="size-4" />
                      Preview
                    </BaseButton>
                    <BaseButton type="button" @click="useTemplate(template)">
                      <Sparkles class="size-4" />
                      Use this
                    </BaseButton>
                  </div>
                </div>
              </article>
            </div>

            <div
              v-if="!templateCatalogLoading && templateCatalog.length === 0"
              class="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900"
            >
              Template belum tersedia. Pastikan seed `landing_pages.is_template=true` sudah masuk.
            </div>
          </div>

          <div
            v-else-if="createPageMode === 'customize'"
            class="space-y-4 rounded-2xl border bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950"
          >
            <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-brand-600">
                  Customize template
                </p>
                <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {{ selectedTemplatePage?.name }}
                </h4>
                <p class="text-sm text-gray-500">
                  Isi basic info di bawah lalu buat draft. Section, SEO, dan branding template ini
                  akan disalin sekaligus — kamu bisa edit content tiap section (termasuk rich text)
                  setelah draft dibuat, dari tab Sections.
                </p>
              </div>
              <BaseButton type="button" variant="secondary" @click="createPageMode = 'catalog'">
                Back to catalog
              </BaseButton>
            </div>

            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Sections yang akan disalin ({{ sectionDrafts.length }})
              </p>
              <ul class="space-y-1.5">
                <li
                  v-for="(section, index) in sectionDrafts"
                  :key="`${section.key}-${index}`"
                  class="flex items-center justify-between rounded-xl border bg-white px-4 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <span class="font-medium text-gray-900 dark:text-gray-100">{{
                    section.name
                  }}</span>
                  <span
                    class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  >
                    {{ section.type }}
                  </span>
                </li>
              </ul>
            </div>

            <div
              v-if="sectionDrafts.length === 0"
              class="rounded-xl border border-dashed bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900"
            >
              Template ini belum punya mapping section.
            </div>
          </div>

          <div
            v-else
            class="rounded-2xl border bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
          >
            Blank page akan dimulai tanpa blueprint. Kamu tetap bisa atur title, slug, type, dan
            publish settings dari panel ini.
          </div>
        </section>

        <section class="space-y-3">
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">Basic Info</h3>
            <p class="text-sm text-gray-500">Nama internal, title publik, dan slug URL.</p>
          </div>
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
        </section>

        <section class="grid gap-3 sm:grid-cols-2">
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
        </section>

        <label class="flex items-start gap-3 rounded-xl border p-3 text-sm dark:border-gray-800">
          <input v-model="pageForm.is_homepage" type="checkbox" class="mt-1" />
          <span>
            <span class="block font-medium">Set as homepage</span>
            <span class="text-gray-500"
              >Backend tetap menyimpan halaman baru sebagai draft sampai dipublish.</span
            >
          </span>
        </label>

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
