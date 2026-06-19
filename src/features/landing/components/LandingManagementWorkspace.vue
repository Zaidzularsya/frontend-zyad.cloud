<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  Archive,
  Brush,
  CalendarClock,
  CheckCircle2,
  Copy,
  Eye,
  FileClock,
  FilePlus2,
  FormInput,
  Globe2,
  Image,
  Link2,
  Loader2,
  Megaphone,
  Menu,
  MousePointerClick,
  PlugZap,
  RefreshCw,
  Rocket,
  Search,
  Settings,
  Trash2,
  Upload,
} from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import TextField from '@/components/form/TextField.vue'
import { landingApi } from '@/features/landing/api'
import type {
  CallToAction,
  LandingAvailableDomain,
  LandingBranding,
  LandingDeliveryLog,
  LandingDomainBinding,
  LandingForm,
  LandingFormField,
  LandingIntegration,
  LandingMedia,
  LandingMenu,
  LandingMenuItem,
  LandingPage,
  LandingRevision,
  LandingSection,
  PageStatus,
  PageType,
  PageVisibility,
  SectionTemplate,
} from '@/features/landing/types'

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    mode?: 'workspace' | 'platform'
  }>(),
  {
    title: 'Landing Page Management',
    description: 'Kelola halaman publik, aset, CTA, navigasi, SEO, publikasi, dan lead delivery.',
    mode: 'workspace',
  },
)

type TabKey =
  | 'overview'
  | 'content'
  | 'seo'
  | 'branding'
  | 'domains'
  | 'media'
  | 'navigation'
  | 'integrations'
  | 'history'

interface PageForm {
  name: string
  title: string
  slug: string
  page_type: PageType
  visibility: PageVisibility
  locale: string
  timezone: string
  is_homepage: boolean
}

interface SeoForm {
  meta_title: string
  meta_description: string
  og_title: string
  og_description: string
  canonical_url: string
}

const pageTypeLabels: Record<PageType, string> = {
  homepage: 'Homepage',
  company_profile: 'Company Profile',
  product_service: 'Product / Service',
  campaign: 'Campaign',
  pricing: 'Pricing',
  contact: 'Contact',
  lead_capture: 'Lead Capture',
  promo_event: 'Promo / Event',
  portfolio_case_study: 'Portfolio / Case Study',
}

const visibilityLabels: Record<PageVisibility, string> = {
  public: 'Public',
  private: 'Private',
  password_protected: 'Password',
}

const tabs: Array<{ key: TabKey; label: string; icon: typeof Settings }> = [
  { key: 'overview', label: 'Overview', icon: Settings },
  { key: 'content', label: 'Content', icon: FilePlus2 },
  { key: 'seo', label: 'SEO', icon: Globe2 },
  { key: 'branding', label: 'Branding', icon: Brush },
  { key: 'domains', label: 'Domains', icon: Link2 },
  { key: 'media', label: 'Media', icon: Image },
  { key: 'navigation', label: 'Navigation', icon: Menu },
  { key: 'integrations', label: 'Leads', icon: PlugZap },
  { key: 'history', label: 'History', icon: FileClock },
]

const loading = ref(true)
const sectionLoading = ref(false)
const saving = ref(false)
const selectedPageId = ref<string | null>(null)
const activeTab = ref<TabKey>('overview')
const searchQuery = ref('')
const statusFilter = ref<'all' | PageStatus>('all')
const notice = ref('')
const errorMessage = ref('')

const pages = ref<LandingPage[]>([])
const sections = ref<LandingSection[]>([])
const forms = ref<LandingForm[]>([])
const formFields = ref<Record<string, LandingFormField[]>>({})
const revisions = ref<LandingRevision[]>([])
const pageBranding = ref<LandingBranding | null>(null)
const availableDomains = ref<LandingAvailableDomain[]>([])
const domainBindings = ref<LandingDomainBinding[]>([])
const mediaItems = ref<LandingMedia[]>([])
const ctas = ref<CallToAction[]>([])
const templates = ref<SectionTemplate[]>([])
const menus = ref<LandingMenu[]>([])
const menuItems = ref<Record<string, LandingMenuItem[]>>({})
const integrations = ref<LandingIntegration[]>([])
const deliveries = ref<LandingDeliveryLog[]>([])
const selectedMenuId = ref<string | null>(null)
const editingMenuId = ref<string | null>(null)
const editingMenuItemId = ref<string | null>(null)
const navigationCapabilityMessage = ref('')
const deliveryCapabilityMessage = ref('')

const pageForm = reactive<PageForm>({
  name: '',
  title: '',
  slug: '',
  page_type: 'homepage',
  visibility: 'public',
  locale: 'id-ID',
  timezone: 'Asia/Jakarta',
  is_homepage: false,
})

const seoForm = reactive<SeoForm>({
  meta_title: '',
  meta_description: '',
  og_title: '',
  og_description: '',
  canonical_url: '',
})

const scheduleForm = reactive({
  action: 'publish' as 'publish' | 'unpublish',
  scheduled_at: '',
})

const ctaForm = reactive({
  name: '',
  label: '',
  type: 'external_link',
  target: 'self',
  destination: '',
  tracking_key: '',
})

const templateForm = reactive({
  name: '',
  description: '',
  section_type: 'hero',
  content: '',
  style: '',
})

const sectionForm = reactive({
  key: '',
  type: 'hero',
  name: '',
  content: '',
  style: '',
})

const landingForm = reactive({
  name: '',
  key: '',
  submit_label: 'Submit',
  success_message: 'Terima kasih, data berhasil dikirim.',
  redirect_url: '',
  is_active: true,
})

const fieldForm = reactive({
  form_id: '',
  key: '',
  type: 'text',
  label: '',
  placeholder: '',
  required: false,
})

const brandingForm = reactive({
  company_name: '',
  tagline: '',
  logo_light_url: '',
  logo_dark_url: '',
  favicon_url: '',
  social_image_url: '',
  colors: '',
  typography: '',
  contact: '',
})

const domainForm = reactive({
  organization_domain_id: '',
  is_primary: true,
})

const menuForm = reactive({
  name: '',
  location: 'header',
  is_active: true,
})

const menuItemForm = reactive({
  parent_id: '',
  label: '',
  link_type: 'internal_page',
  destination: '',
  target: 'self',
  is_enabled: true,
})

const integrationForm = reactive({
  name: '',
  type: 'webhook',
  endpoint_url: '',
  event_filters: 'lead_submitted',
  is_active: true,
})

const selectedPage = computed(() =>
  selectedPageId.value ? pages.value.find((page) => page.id === selectedPageId.value) : null,
)

const filteredPages = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return pages.value.filter((page) => {
    const matchStatus = statusFilter.value === 'all' || page.status === statusFilter.value
    const matchQuery =
      !query ||
      [page.name, page.title, page.slug, page.page_type].some((value) =>
        value.toLowerCase().includes(query),
      )
    return matchStatus && matchQuery
  })
})

const publishedCount = computed(
  () => pages.value.filter((page) => page.status === 'published').length,
)
const draftCount = computed(() => pages.value.filter((page) => page.status === 'draft').length)
const archivedCount = computed(
  () => pages.value.filter((page) => page.status === 'archived').length,
)
const selectedMenuItems = computed(() =>
  selectedMenuId.value ? (menuItems.value[selectedMenuId.value] ?? []) : [],
)
const selectedMenu = computed(() =>
  selectedMenuId.value ? menus.value.find((menu) => menu.id === selectedMenuId.value) : null,
)
const selectedFieldItems = computed(() =>
  fieldForm.form_id ? (formFields.value[fieldForm.form_id] ?? []) : [],
)

const publicUrl = computed(() => (selectedPage.value ? `/${selectedPage.value.slug}` : ''))
const seoScore = computed(() => {
  let score = 0
  if (seoForm.meta_title.length >= 25) score += 25
  if (seoForm.meta_description.length >= 80) score += 25
  if (seoForm.og_title.length > 0) score += 20
  if (seoForm.canonical_url.length > 0) score += 15
  if (selectedPage.value?.visibility === 'public') score += 15
  return score
})

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

function resetPageForm() {
  pageForm.name = ''
  pageForm.title = ''
  pageForm.slug = ''
  pageForm.page_type = 'homepage'
  pageForm.visibility = 'public'
  pageForm.locale = 'id-ID'
  pageForm.timezone = 'Asia/Jakarta'
  pageForm.is_homepage = false
  resetSeoForm()
}

function resetSeoForm() {
  seoForm.meta_title = ''
  seoForm.meta_description = ''
  seoForm.og_title = ''
  seoForm.og_description = ''
  seoForm.canonical_url = ''
}

function resetSectionForm() {
  sectionForm.key = ''
  sectionForm.type = 'hero'
  sectionForm.name = ''
  sectionForm.content = ''
  sectionForm.style = ''
}

function resetLandingForm() {
  landingForm.name = ''
  landingForm.key = ''
  landingForm.submit_label = 'Submit'
  landingForm.success_message = 'Terima kasih, data berhasil dikirim.'
  landingForm.redirect_url = ''
  landingForm.is_active = true
}

function resetFieldForm() {
  fieldForm.key = ''
  fieldForm.type = 'text'
  fieldForm.label = ''
  fieldForm.placeholder = ''
  fieldForm.required = false
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function stringifyJson(value: unknown) {
  if (!value || (typeof value === 'object' && Object.keys(value).length === 0)) return ''
  return JSON.stringify(value, null, 2)
}

function fillBrandingForm(branding: LandingBranding | null) {
  brandingForm.company_name = branding?.company_name ?? ''
  brandingForm.tagline = branding?.tagline ?? ''
  brandingForm.logo_light_url = branding?.logo_light_url ?? ''
  brandingForm.logo_dark_url = branding?.logo_dark_url ?? ''
  brandingForm.favicon_url = branding?.favicon_url ?? ''
  brandingForm.social_image_url = branding?.social_image_url ?? ''
  brandingForm.colors = stringifyJson(branding?.colors)
  brandingForm.typography = stringifyJson(branding?.typography)
  brandingForm.contact = stringifyJson(branding?.contact)
}

function fillPageForm(page: LandingPage) {
  pageForm.name = page.name
  pageForm.title = page.title
  pageForm.slug = page.slug
  pageForm.page_type = page.page_type
  pageForm.visibility = page.visibility
  pageForm.locale = page.locale || 'id-ID'
  pageForm.timezone = page.timezone || 'Asia/Jakarta'
  pageForm.is_homepage = page.is_homepage

  const seo = page.seo ?? {}
  const openGraph = seo.open_graph as Record<string, unknown> | undefined
  seoForm.meta_title = String(seo.meta_title ?? page.title ?? '')
  seoForm.meta_description = String(seo.meta_description ?? '')
  seoForm.og_title = String(openGraph?.title ?? seo.og_title ?? '')
  seoForm.og_description = String(openGraph?.description ?? seo.og_description ?? '')
  seoForm.canonical_url = String(seo.canonical_url ?? '')
}

function selectPage(page: LandingPage) {
  selectedPageId.value = page.id
  fillPageForm(page)
  void loadPageDetails(page.id)
}

async function loadPages() {
  const response = await landingApi.getPages({ per_page: 50 })
  pages.value = response.data
  const selectedStillExists = pages.value.some((page) => page.id === selectedPageId.value)
  const nextPage = selectedStillExists
    ? pages.value.find((page) => page.id === selectedPageId.value)
    : pages.value[0]

  if (nextPage) {
    selectedPageId.value = nextPage.id
    fillPageForm(nextPage)
  } else {
    selectedPageId.value = null
    resetPageForm()
  }
}

async function loadPageDetails(pageId: string) {
  sectionLoading.value = true
  try {
    const [
      revisionResponse,
      sectionResponse,
      formResponse,
      brandingResponse,
      availableDomainResponse,
      domainBindingResponse,
      mediaResponse,
      ctaResponse,
      templateResponse,
      menuResponse,
      integrationResponse,
      deliveryResponse,
    ] = await Promise.all([
      landingApi.getRevisions(pageId).catch(() => ({ data: [] as LandingRevision[] })),
      landingApi.getSections(pageId).catch(() => ({ data: [] as LandingSection[] })),
      landingApi.getForms(pageId).catch(() => ({ data: [] as LandingForm[] })),
      landingApi.getPageBranding(pageId).catch(() => ({ data: null as LandingBranding | null })),
      landingApi.getAvailableDomains().catch(() => ({ data: [] as LandingAvailableDomain[] })),
      landingApi.getDomainBindings(pageId).catch(() => ({ data: [] as LandingDomainBinding[] })),
      landingApi.getMedia({ per_page: 30 }).catch(() => ({ data: [] as LandingMedia[] })),
      landingApi.getCTAs({ per_page: 30 }).catch(() => ({ data: [] as CallToAction[] })),
      landingApi.getTemplates({ per_page: 30 }).catch(() => ({ data: [] as SectionTemplate[] })),
      landingApi.getMenus({ per_page: 30 }).catch((error) => {
        navigationCapabilityMessage.value = getApiMessage(error, 'Menu gagal dimuat.')
        return { data: [] as LandingMenu[] }
      }),
      landingApi
        .getIntegrations({ per_page: 30 })
        .catch(() => ({ data: [] as LandingIntegration[] })),
      landingApi.getDeliveries({ per_page: 30 }).catch((error) => {
        const status = (error as { response?: { status?: number } }).response?.status
        deliveryCapabilityMessage.value =
          status === 501
            ? 'Lead delivery log belum aktif di backend.'
            : 'Lead delivery log gagal dimuat.'
        return { data: [] as LandingDeliveryLog[] }
      }),
    ])

    revisions.value = revisionResponse.data
    sections.value = sectionResponse.data
    forms.value = formResponse.data
    pageBranding.value = brandingResponse.data
    fillBrandingForm(pageBranding.value)
    availableDomains.value = availableDomainResponse.data
    domainBindings.value = domainBindingResponse.data
    mediaItems.value = mediaResponse.data
    ctas.value = ctaResponse.data
    templates.value = templateResponse.data
    menus.value = menuResponse.data
    if (menus.value.length > 0) navigationCapabilityMessage.value = ''
    integrations.value = integrationResponse.data
    deliveries.value = deliveryResponse.data
    if (deliveries.value.length > 0) deliveryCapabilityMessage.value = ''

    const nextMenu = menus.value[0]
    selectedMenuId.value =
      selectedMenuId.value && menus.value.some((menu) => menu.id === selectedMenuId.value)
        ? selectedMenuId.value
        : (nextMenu?.id ?? null)

    if (selectedMenuId.value) await loadMenuItems(selectedMenuId.value)
    fieldForm.form_id = forms.value.some((form) => form.id === fieldForm.form_id)
      ? fieldForm.form_id
      : (forms.value[0]?.id ?? '')
    if (fieldForm.form_id && !formFields.value[fieldForm.form_id]) {
      formFields.value = { ...formFields.value, [fieldForm.form_id]: [] }
    }
  } finally {
    sectionLoading.value = false
  }
}

async function refreshAll() {
  loading.value = true
  errorMessage.value = ''
  try {
    await loadPages()
    if (selectedPageId.value) await loadPageDetails(selectedPageId.value)
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal memuat data landing page.')
  } finally {
    loading.value = false
  }
}

async function savePage() {
  saving.value = true
  errorMessage.value = ''
  try {
    const payload = {
      ...pageForm,
      is_homepage: pageForm.page_type === 'homepage' || pageForm.is_homepage,
    }

    if (selectedPageId.value) {
      await landingApi.updatePage(selectedPageId.value, payload)
      showNotice('Halaman berhasil diperbarui.')
    } else {
      const response = await landingApi.createPage(payload)
      selectedPageId.value = response.data.id
      showNotice('Halaman baru berhasil dibuat.')
    }

    await refreshAll()
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menyimpan halaman.')
  } finally {
    saving.value = false
  }
}

async function saveSeo() {
  if (!selectedPageId.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.updateSEO(selectedPageId.value, {
      meta_title: seoForm.meta_title,
      meta_description: seoForm.meta_description,
      meta_keywords: [],
      canonical_url: seoForm.canonical_url || null,
      robots: {
        index: true,
        follow: true,
      },
      open_graph: {
        title: seoForm.og_title,
        description: seoForm.og_description,
        image_asset_id: '',
      },
      twitter_card: 'summary_large_image',
      schema_markup: {},
      sitemap: {
        included: true,
        priority: pageForm.is_homepage ? 1 : 0.8,
      },
    })
    showNotice('SEO berhasil diperbarui.')
    await refreshAll()
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menyimpan SEO.')
  } finally {
    saving.value = false
  }
}

async function runPageAction(
  action: 'publish' | 'unpublish' | 'archive' | 'restore' | 'delete' | 'duplicate',
) {
  if (!selectedPageId.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    if (action === 'publish') await landingApi.publishPage(selectedPageId.value)
    if (action === 'unpublish') await landingApi.unpublishPage(selectedPageId.value)
    if (action === 'archive') await landingApi.archivePage(selectedPageId.value)
    if (action === 'restore') await landingApi.restorePage(selectedPageId.value)
    if (action === 'delete') await landingApi.deletePage(selectedPageId.value)
    if (action === 'duplicate') {
      await landingApi.duplicatePage(selectedPageId.value, {
        name: `${pageForm.name} Copy`,
        slug: `${pageForm.slug}-copy`,
      })
    }
    showNotice('Aksi halaman berhasil dijalankan.')
    await refreshAll()
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Aksi halaman gagal dijalankan.')
  } finally {
    saving.value = false
  }
}

async function schedulePage() {
  if (!selectedPageId.value || !scheduleForm.scheduled_at) return
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.schedulePage(selectedPageId.value, {
      publish_at:
        scheduleForm.action === 'publish'
          ? new Date(scheduleForm.scheduled_at).toISOString()
          : null,
      unpublish_at:
        scheduleForm.action === 'unpublish'
          ? new Date(scheduleForm.scheduled_at).toISOString()
          : null,
      timezone: pageForm.timezone,
    })
    showNotice('Jadwal publikasi berhasil disimpan.')
    scheduleForm.scheduled_at = ''
    await refreshAll()
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menyimpan jadwal publikasi.')
  } finally {
    saving.value = false
  }
}

async function cancelSchedule() {
  if (!selectedPageId.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.cancelSchedule(selectedPageId.value)
    showNotice('Jadwal publikasi berhasil dibatalkan.')
    await refreshAll()
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal membatalkan jadwal publikasi.')
  } finally {
    saving.value = false
  }
}

async function restoreRevision(revision: LandingRevision) {
  if (!selectedPageId.value) return
  const revisionKey = String(revision.revision_number ?? revision.version ?? revision.id)
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.restoreRevision(selectedPageId.value, revisionKey)
    showNotice('Revision berhasil dipulihkan.')
    await refreshAll()
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal memulihkan revision.')
  } finally {
    saving.value = false
  }
}

async function uploadMedia(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  saving.value = true
  errorMessage.value = ''
  try {
    const payload = new FormData()
    payload.append('file', file)
    payload.append('alt_text', file.name)
    await landingApi.uploadMedia(payload)
    showNotice('Media berhasil diupload.')
    if (selectedPageId.value) await loadPageDetails(selectedPageId.value)
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal upload media.')
  } finally {
    input.value = ''
    saving.value = false
  }
}

async function deleteMedia(id: string) {
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.deleteMedia(id)
    mediaItems.value = mediaItems.value.filter((item) => item.id !== id)
    showNotice('Media berhasil dihapus.')
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menghapus media.')
  } finally {
    saving.value = false
  }
}

async function saveCta() {
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.createCTA({
      ...ctaForm,
      tracking_key: slugify(ctaForm.tracking_key || ctaForm.name || ctaForm.label),
    })
    ctaForm.name = ''
    ctaForm.label = ''
    ctaForm.destination = ''
    ctaForm.tracking_key = ''
    showNotice('CTA berhasil dibuat.')
    if (selectedPageId.value) await loadPageDetails(selectedPageId.value)
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal membuat CTA.')
  } finally {
    saving.value = false
  }
}

async function deleteCta(id: string) {
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.deleteCTA(id)
    ctas.value = ctas.value.filter((cta) => cta.id !== id)
    showNotice('CTA berhasil dihapus.')
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menghapus CTA.')
  } finally {
    saving.value = false
  }
}

function parseJsonField(value: string) {
  if (!value.trim()) return {}
  return JSON.parse(value) as Record<string, unknown>
}

async function saveSection() {
  if (!selectedPageId.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.createSection(selectedPageId.value, {
      key: sectionForm.key || slugify(sectionForm.name),
      type: sectionForm.type,
      name: sectionForm.name,
      sort_order: sections.value.length + 1,
      is_enabled: true,
      content: parseJsonField(sectionForm.content),
      style: parseJsonField(sectionForm.style),
    })
    resetSectionForm()
    showNotice('Section berhasil dibuat.')
    await loadPageDetails(selectedPageId.value)
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal membuat section. Pastikan JSON valid.')
  } finally {
    saving.value = false
  }
}

async function toggleSection(section: LandingSection) {
  if (!selectedPageId.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.updateSection(selectedPageId.value, section.id, {
      is_enabled: !section.is_enabled,
    })
    await loadPageDetails(selectedPageId.value)
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal mengubah status section.')
  } finally {
    saving.value = false
  }
}

async function deleteSection(sectionId: string) {
  if (!selectedPageId.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.deleteSection(selectedPageId.value, sectionId)
    sections.value = sections.value.filter((section) => section.id !== sectionId)
    showNotice('Section berhasil dihapus.')
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menghapus section.')
  } finally {
    saving.value = false
  }
}

async function moveSection(section: LandingSection, direction: -1 | 1) {
  if (!selectedPageId.value) return
  const ordered = [...sections.value].sort((a, b) => a.sort_order - b.sort_order)
  const index = ordered.findIndex((item) => item.id === section.id)
  const swapIndex = index + direction
  if (index < 0 || swapIndex < 0 || swapIndex >= ordered.length) return

  const current = ordered[index]
  const target = ordered[swapIndex]
  if (!current || !target) return

  const currentOrder = current.sort_order
  current.sort_order = target.sort_order
  target.sort_order = currentOrder

  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.reorderSections(selectedPageId.value, {
      items: ordered.map((item) => ({ id: item.id, sort_order: item.sort_order })),
    })
    await loadPageDetails(selectedPageId.value)
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal mengurutkan section.')
  } finally {
    saving.value = false
  }
}

async function saveTemplate() {
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.createTemplate({
      name: templateForm.name,
      description: templateForm.description,
      section_type: templateForm.section_type,
      content: parseJsonField(templateForm.content),
      style: parseJsonField(templateForm.style),
    })
    templateForm.name = ''
    templateForm.description = ''
    templateForm.content = ''
    templateForm.style = ''
    showNotice('Template section berhasil dibuat.')
    if (selectedPageId.value) await loadPageDetails(selectedPageId.value)
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal membuat template. Pastikan JSON valid.')
  } finally {
    saving.value = false
  }
}

async function saveLandingForm() {
  if (!selectedPageId.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    const response = await landingApi.createForm(selectedPageId.value, {
      ...landingForm,
      key: landingForm.key || slugify(landingForm.name),
      redirect_url: landingForm.redirect_url || null,
      consent: {},
    })
    fieldForm.form_id = response.data.id
    resetLandingForm()
    showNotice('Form berhasil dibuat.')
    await loadPageDetails(selectedPageId.value)
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal membuat form.')
  } finally {
    saving.value = false
  }
}

async function deleteLandingForm(formId: string) {
  if (!selectedPageId.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.deleteForm(selectedPageId.value, formId)
    forms.value = forms.value.filter((form) => form.id !== formId)
    showNotice('Form berhasil dihapus.')
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menghapus form.')
  } finally {
    saving.value = false
  }
}

async function addFormField() {
  if (!selectedPageId.value || !fieldForm.form_id) return
  const currentFields = selectedFieldItems.value
  saving.value = true
  errorMessage.value = ''
  try {
    const fields = [
      ...currentFields.map((field, index) => ({
        key: field.key,
        type: field.type,
        label: field.label,
        placeholder: field.placeholder ?? '',
        options: field.options ?? [],
        validation: field.validation ?? {},
        required: field.required,
        sort_order: index + 1,
      })),
      {
        key: fieldForm.key || slugify(fieldForm.label).replaceAll('-', '_'),
        type: fieldForm.type,
        label: fieldForm.label,
        placeholder: fieldForm.placeholder,
        options: [],
        validation: {},
        required: fieldForm.required,
        sort_order: currentFields.length + 1,
      },
    ]
    const response = await landingApi.replaceFormFields(selectedPageId.value, fieldForm.form_id, {
      fields,
    })
    formFields.value = { ...formFields.value, [fieldForm.form_id]: response.data }
    resetFieldForm()
    showNotice('Field form berhasil ditambahkan.')
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menyimpan field form.')
  } finally {
    saving.value = false
  }
}

async function saveBranding() {
  if (!selectedPageId.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    const response = await landingApi.updatePageBranding(selectedPageId.value, {
      company_name: brandingForm.company_name || null,
      tagline: brandingForm.tagline || null,
      logo_light_url: brandingForm.logo_light_url || null,
      logo_dark_url: brandingForm.logo_dark_url || null,
      favicon_url: brandingForm.favicon_url || null,
      social_image_url: brandingForm.social_image_url || null,
      colors: parseJsonField(brandingForm.colors),
      typography: parseJsonField(brandingForm.typography),
      contact: parseJsonField(brandingForm.contact),
    })
    pageBranding.value = response.data
    fillBrandingForm(response.data)
    showNotice('Branding halaman berhasil disimpan.')
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menyimpan branding. Pastikan JSON valid.')
  } finally {
    saving.value = false
  }
}

async function removeBrandingOverride() {
  if (!selectedPageId.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.deletePageBranding(selectedPageId.value)
    pageBranding.value = null
    fillBrandingForm(null)
    showNotice('Override branding halaman dihapus.')
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menghapus override branding.')
  } finally {
    saving.value = false
  }
}

function domainLabel(domain: LandingAvailableDomain) {
  return domain.domain ?? domain.hostname ?? String(domain.id)
}

async function saveDomainBinding() {
  if (!selectedPageId.value || !domainForm.organization_domain_id) return
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.createDomainBinding({
      organization_domain_id: domainForm.organization_domain_id,
      landing_page_id: selectedPageId.value,
      is_primary: domainForm.is_primary,
    })
    domainForm.organization_domain_id = ''
    showNotice('Domain berhasil dibind ke halaman.')
    await loadPageDetails(selectedPageId.value)
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal bind domain.')
  } finally {
    saving.value = false
  }
}

async function setPrimaryDomain(binding: LandingDomainBinding) {
  if (!selectedPageId.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.updateDomainBinding(binding.id, {
      organization_domain_id: binding.organization_domain_id,
      landing_page_id: selectedPageId.value,
      is_primary: true,
    })
    await loadPageDetails(selectedPageId.value)
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal mengubah primary domain.')
  } finally {
    saving.value = false
  }
}

async function deleteDomainBinding(id: string) {
  if (!selectedPageId.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.deleteDomainBinding(id)
    domainBindings.value = domainBindings.value.filter((binding) => binding.id !== id)
    showNotice('Domain binding berhasil dihapus.')
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menghapus domain binding.')
  } finally {
    saving.value = false
  }
}

async function instantiateTemplate(template: SectionTemplate) {
  if (!selectedPageId.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.instantiateTemplate(selectedPageId.value, {
      template_id: template.id,
      section_key: slugify(`${template.section_type}-${template.name}-${Date.now()}`),
      sort_order: 999,
    })
    showNotice('Template berhasil ditambahkan ke halaman.')
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menambahkan template ke halaman.')
  } finally {
    saving.value = false
  }
}

async function saveMenu() {
  saving.value = true
  errorMessage.value = ''
  try {
    if (editingMenuId.value) {
      const response = await landingApi.updateMenu(editingMenuId.value, { ...menuForm })
      selectedMenuId.value = response.data.id
      showNotice('Menu berhasil diperbarui.')
    } else {
      const response = await landingApi.createMenu({ ...menuForm })
      selectedMenuId.value = response.data.id
      showNotice('Menu berhasil dibuat.')
    }
    resetMenuForm()
    if (selectedPageId.value) await loadPageDetails(selectedPageId.value)
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menyimpan menu.')
  } finally {
    saving.value = false
  }
}

function resetMenuForm() {
  editingMenuId.value = null
  menuForm.name = ''
  menuForm.location = 'header'
  menuForm.is_active = true
}

function editMenu(menu: LandingMenu) {
  editingMenuId.value = menu.id
  selectedMenuId.value = menu.id
  menuForm.name = menu.name
  menuForm.location = menu.location
  menuForm.is_active = menu.is_active
  void loadMenuItems(menu.id)
}

async function toggleMenu(menu: LandingMenu) {
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.updateMenu(menu.id, {
      name: menu.name,
      location: menu.location,
      is_active: !menu.is_active,
    })
    showNotice('Status menu berhasil diperbarui.')
    if (selectedPageId.value) await loadPageDetails(selectedPageId.value)
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal mengubah status menu.')
  } finally {
    saving.value = false
  }
}

async function deleteMenu(id: string) {
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.deleteMenu(id)
    if (selectedMenuId.value === id) selectedMenuId.value = null
    if (editingMenuId.value === id) resetMenuForm()
    menus.value = menus.value.filter((menu) => menu.id !== id)
    showNotice('Menu berhasil dihapus.')
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menghapus menu.')
  } finally {
    saving.value = false
  }
}

async function loadMenuItems(menuId: string) {
  const response = await landingApi.getMenuItems(menuId)
  menuItems.value = {
    ...menuItems.value,
    [menuId]: response.data,
  }
}

function selectMenu(menuId: string) {
  selectedMenuId.value = menuId
  void loadMenuItems(menuId)
}

async function saveMenuItem() {
  if (!selectedMenuId.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    const payload = {
      ...menuItemForm,
      parent_id: menuItemForm.parent_id || null,
      sort_order: editingMenuItemId.value
        ? selectedMenuItems.value.find((item) => item.id === editingMenuItemId.value)?.sort_order
        : selectedMenuItems.value.length + 1,
    }

    if (editingMenuItemId.value) {
      await landingApi.updateMenuItem(selectedMenuId.value, editingMenuItemId.value, payload)
      showNotice('Item menu berhasil diperbarui.')
    } else {
      await landingApi.createMenuItem(selectedMenuId.value, payload)
      showNotice('Item menu berhasil ditambahkan.')
    }
    resetMenuItemForm()
    await loadMenuItems(selectedMenuId.value)
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menyimpan item menu.')
  } finally {
    saving.value = false
  }
}

function resetMenuItemForm() {
  editingMenuItemId.value = null
  menuItemForm.parent_id = ''
  menuItemForm.label = ''
  menuItemForm.link_type = 'internal_page'
  menuItemForm.destination = ''
  menuItemForm.target = 'self'
  menuItemForm.is_enabled = true
}

function editMenuItem(item: LandingMenuItem) {
  editingMenuItemId.value = item.id
  menuItemForm.parent_id = item.parent_id ?? ''
  menuItemForm.label = item.label
  menuItemForm.link_type = item.link_type
  menuItemForm.destination = item.destination
  menuItemForm.target = item.target
  menuItemForm.is_enabled = item.is_enabled
}

async function toggleMenuItem(item: LandingMenuItem) {
  if (!selectedMenuId.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.updateMenuItem(selectedMenuId.value, item.id, {
      parent_id: item.parent_id ?? null,
      label: item.label,
      link_type: item.link_type,
      destination: item.destination,
      target: item.target,
      sort_order: item.sort_order,
      is_enabled: !item.is_enabled,
    })
    await loadMenuItems(selectedMenuId.value)
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal mengubah status item menu.')
  } finally {
    saving.value = false
  }
}

async function moveMenuItem(item: LandingMenuItem, direction: -1 | 1) {
  if (!selectedMenuId.value) return
  const ordered = [...selectedMenuItems.value].sort((a, b) => a.sort_order - b.sort_order)
  const index = ordered.findIndex((entry) => entry.id === item.id)
  const swapIndex = index + direction
  if (index < 0 || swapIndex < 0 || swapIndex >= ordered.length) return

  const current = ordered[index]
  const target = ordered[swapIndex]
  if (!current || !target) return

  const currentOrder = current.sort_order
  current.sort_order = target.sort_order
  target.sort_order = currentOrder

  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.reorderMenuItems(selectedMenuId.value, {
      item_ids: ordered.map((entry) => entry.id),
    })
    await loadMenuItems(selectedMenuId.value)
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal mengurutkan item menu.')
  } finally {
    saving.value = false
  }
}

async function deleteMenuItem(itemId: string) {
  if (!selectedMenuId.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.deleteMenuItem(selectedMenuId.value, itemId)
    await loadMenuItems(selectedMenuId.value)
    showNotice('Item menu berhasil dihapus.')
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menghapus item menu.')
  } finally {
    saving.value = false
  }
}

async function saveIntegration() {
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.createIntegration({
      name: integrationForm.name,
      type: integrationForm.type,
      credentials: { endpoint_url: integrationForm.endpoint_url },
      event_filters: integrationForm.event_filters
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      is_active: integrationForm.is_active,
    })
    integrationForm.name = ''
    integrationForm.endpoint_url = ''
    showNotice('Lead integration berhasil dibuat.')
    if (selectedPageId.value) await loadPageDetails(selectedPageId.value)
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal membuat integration.')
  } finally {
    saving.value = false
  }
}

async function testIntegration(id: string) {
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.testIntegration(id)
    showNotice('Test integration berhasil dikirim.')
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status
    errorMessage.value =
      status === 501
        ? 'Test integration belum diimplementasikan di backend.'
        : getApiMessage(error, 'Test integration gagal.')
  } finally {
    saving.value = false
  }
}

async function retryDelivery(id: string) {
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.retryDelivery(id)
    showNotice('Delivery retry berhasil diminta.')
    if (selectedPageId.value) await loadPageDetails(selectedPageId.value)
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status
    errorMessage.value =
      status === 501
        ? 'Retry delivery belum diimplementasikan di backend.'
        : getApiMessage(error, 'Gagal retry delivery.')
  } finally {
    saving.value = false
  }
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

onMounted(() => {
  void refreshAll()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <PageHeader :title="props.title" :description="props.description" />
      <div class="flex flex-wrap gap-2">
        <BaseButton variant="outline" :disabled="loading || saving" @click="refreshAll">
          <RefreshCw class="size-4" :class="{ 'animate-spin': loading }" />
          Refresh
        </BaseButton>
        <BaseButton :disabled="saving" @click="savePage">
          <FilePlus2 class="size-4" />
          {{ selectedPageId ? 'Save Page' : 'Create Page' }}
        </BaseButton>
      </div>
    </div>

    <div
      v-if="notice || errorMessage"
      class="grid gap-3 md:grid-cols-2"
      :class="{ 'md:grid-cols-1': !notice || !errorMessage }"
    >
      <div
        v-if="notice"
        class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
      >
        {{ notice }}
      </div>
      <div
        v-if="errorMessage"
        class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
      >
        {{ errorMessage }}
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-4">
      <BaseCard>
        <div class="flex items-center justify-between">
          <p class="text-sm text-gray-500">Total pages</p>
          <Globe2 class="size-5 text-brand-500" />
        </div>
        <p class="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{{ pages.length }}</p>
      </BaseCard>
      <BaseCard>
        <div class="flex items-center justify-between">
          <p class="text-sm text-gray-500">Published</p>
          <CheckCircle2 class="size-5 text-emerald-500" />
        </div>
        <p class="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{{ publishedCount }}</p>
      </BaseCard>
      <BaseCard>
        <div class="flex items-center justify-between">
          <p class="text-sm text-gray-500">Draft</p>
          <FileClock class="size-5 text-amber-500" />
        </div>
        <p class="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{{ draftCount }}</p>
      </BaseCard>
      <BaseCard>
        <div class="flex items-center justify-between">
          <p class="text-sm text-gray-500">Archived</p>
          <Archive class="size-5 text-gray-500" />
        </div>
        <p class="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{{ archivedCount }}</p>
      </BaseCard>
    </div>

    <div class="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside class="space-y-4">
        <BaseCard>
          <div
            class="flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2 dark:bg-gray-950"
          >
            <Search class="size-4 text-gray-400" />
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Cari page, slug, tipe..."
              class="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>

          <div class="mt-3 grid grid-cols-4 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-950">
            <button
              v-for="status in ['all', 'draft', 'published', 'unpublished', 'archived']"
              :key="status"
              class="rounded-md px-2 py-1.5 text-xs font-semibold capitalize transition"
              :class="
                statusFilter === status
                  ? 'bg-white text-brand-600 shadow-sm dark:bg-gray-900'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
              "
              @click="statusFilter = status as 'all' | PageStatus"
            >
              {{ status }}
            </button>
          </div>

          <div class="mt-4 space-y-2">
            <button
              v-for="page in filteredPages"
              :key="page.id"
              class="w-full rounded-lg border p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40 dark:hover:bg-brand-950/20"
              :class="
                selectedPageId === page.id
                  ? 'border-brand-400 bg-brand-50 dark:bg-brand-950/30'
                  : 'border-gray-200 dark:border-gray-800'
              "
              @click="selectPage(page)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {{ page.name }}
                  </p>
                  <p class="mt-1 truncate text-xs text-gray-500">/{{ page.slug }}</p>
                </div>
                <span
                  class="rounded-full px-2 py-1 text-[11px] font-bold capitalize"
                  :class="{
                    'bg-emerald-50 text-emerald-700': page.status === 'published',
                    'bg-amber-50 text-amber-700': page.status === 'draft',
                    'bg-gray-100 text-gray-600': page.status === 'archived',
                  }"
                >
                  {{ page.status }}
                </span>
              </div>
              <div class="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>{{ pageTypeLabels[page.page_type] }}</span>
                <span>{{ visibilityLabels[page.visibility] }}</span>
              </div>
            </button>

            <div
              v-if="!loading && filteredPages.length === 0"
              class="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500"
            >
              Belum ada landing page yang cocok.
            </div>
          </div>
        </BaseCard>
      </aside>

      <main class="space-y-5">
        <BaseCard>
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white">
                  {{ selectedPage?.title || 'New landing page' }}
                </h2>
                <span
                  v-if="selectedPage"
                  class="rounded-full px-2 py-1 text-xs font-bold capitalize"
                  :class="{
                    'bg-emerald-50 text-emerald-700': selectedPage.status === 'published',
                    'bg-amber-50 text-amber-700': selectedPage.status === 'draft',
                    'bg-gray-100 text-gray-600': selectedPage.status === 'archived',
                  }"
                >
                  {{ selectedPage.status }}
                </span>
              </div>
              <p class="mt-1 text-sm text-gray-500">
                {{
                  selectedPage
                    ? publicUrl
                    : 'Buat halaman baru, lalu kelola konten dan publikasinya.'
                }}
              </p>
            </div>
            <div v-if="selectedPage" class="flex flex-wrap gap-2">
              <BaseButton variant="outline" @click="runPageAction('duplicate')">
                <Copy class="size-4" />
                Duplicate
              </BaseButton>
              <BaseButton
                v-if="selectedPage.status !== 'published'"
                @click="runPageAction('publish')"
              >
                <Rocket class="size-4" />
                Publish
              </BaseButton>
              <BaseButton v-else variant="secondary" @click="runPageAction('unpublish')">
                <Eye class="size-4" />
                Unpublish
              </BaseButton>
            </div>
          </div>
        </BaseCard>

        <div class="overflow-x-auto rounded-xl border bg-white p-1 shadow-sm dark:bg-gray-900">
          <div class="flex min-w-max gap-1">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition"
              :class="
                activeTab === tab.key
                  ? 'bg-brand-50 text-brand-600 dark:bg-brand-950'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100'
              "
              @click="activeTab = tab.key"
            >
              <component :is="tab.icon" class="size-4" />
              {{ tab.label }}
            </button>
          </div>
        </div>

        <div
          v-if="loading"
          class="rounded-xl border bg-white p-12 text-center text-sm text-gray-500 dark:bg-gray-900"
        >
          <Loader2 class="mx-auto mb-3 size-6 animate-spin text-brand-500" />
          Memuat landing management...
        </div>

        <template v-else>
          <section
            v-if="activeTab === 'overview'"
            class="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]"
          >
            <BaseCard>
              <div class="mb-5 flex items-center gap-3">
                <Settings class="size-5 text-brand-500" />
                <h3 class="font-semibold text-gray-900 dark:text-white">Page settings</h3>
              </div>
              <form class="space-y-4" @submit.prevent="savePage">
                <div class="grid gap-4 md:grid-cols-2">
                  <TextField
                    v-model="pageForm.name"
                    name="name"
                    label="Internal name"
                    placeholder="Promo Akhir Tahun"
                  />
                  <TextField
                    v-model="pageForm.title"
                    name="title"
                    label="Page title"
                    placeholder="Internet Cepat untuk Bisnis"
                  />
                  <TextField
                    v-model="pageForm.slug"
                    name="slug"
                    label="Slug"
                    placeholder="promo-bisnis"
                  />
                  <TextField
                    v-model="pageForm.locale"
                    name="locale"
                    label="Locale"
                    placeholder="id-ID"
                  />
                </div>

                <div class="grid gap-4 md:grid-cols-3">
                  <label class="block">
                    <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >Page type</span
                    >
                    <select
                      v-model="pageForm.page_type"
                      class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100 dark:bg-gray-950"
                    >
                      <option v-for="(label, value) in pageTypeLabels" :key="value" :value="value">
                        {{ label }}
                      </option>
                    </select>
                  </label>
                  <label class="block">
                    <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >Visibility</span
                    >
                    <select
                      v-model="pageForm.visibility"
                      class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100 dark:bg-gray-950"
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                      <option value="password_protected">Password protected</option>
                    </select>
                  </label>
                  <TextField
                    v-model="pageForm.timezone"
                    name="timezone"
                    label="Timezone"
                    placeholder="Asia/Jakarta"
                  />
                </div>

                <label
                  class="flex items-center justify-between rounded-lg border bg-gray-50 px-4 py-3 dark:bg-gray-950"
                >
                  <span>
                    <span class="block text-sm font-semibold text-gray-900 dark:text-white"
                      >Set as homepage</span
                    >
                    <span class="text-xs text-gray-500"
                      >Homepage akan menjadi halaman utama tenant.</span
                    >
                  </span>
                  <input
                    v-model="pageForm.is_homepage"
                    type="checkbox"
                    class="size-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                </label>

                <div class="flex justify-end">
                  <BaseButton type="submit" :disabled="saving">
                    <Loader2 v-if="saving" class="size-4 animate-spin" />
                    Save settings
                  </BaseButton>
                </div>
              </form>
            </BaseCard>

            <div class="space-y-5">
              <BaseCard>
                <div class="mb-4 flex items-center gap-3">
                  <CalendarClock class="size-5 text-brand-500" />
                  <h3 class="font-semibold text-gray-900 dark:text-white">Publication schedule</h3>
                </div>
                <form class="space-y-3" @submit.prevent="schedulePage">
                  <select
                    v-model="scheduleForm.action"
                    class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
                  >
                    <option value="publish">Publish</option>
                    <option value="unpublish">Unpublish</option>
                  </select>
                  <input
                    v-model="scheduleForm.scheduled_at"
                    type="datetime-local"
                    class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
                  />
                  <BaseButton class="w-full" :disabled="!selectedPageId || saving"
                    >Schedule</BaseButton
                  >
                </form>
                <div
                  v-if="selectedPage?.publish_at || selectedPage?.unpublish_at"
                  class="mt-4 rounded-lg border bg-gray-50 p-3 text-sm dark:bg-gray-950"
                >
                  <p class="font-semibold text-gray-900 dark:text-white">Active schedule</p>
                  <p class="mt-1 text-gray-500">
                    Publish: {{ formatDate(selectedPage.publish_at) }} · Unpublish:
                    {{ formatDate(selectedPage.unpublish_at) }}
                  </p>
                  <BaseButton class="mt-3 w-full" variant="outline" @click="cancelSchedule">
                    Cancel schedule
                  </BaseButton>
                </div>
              </BaseCard>

              <BaseCard v-if="selectedPage">
                <div class="mb-4 flex items-center gap-3">
                  <Megaphone class="size-5 text-brand-500" />
                  <h3 class="font-semibold text-gray-900 dark:text-white">Lifecycle</h3>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <BaseButton variant="outline" @click="runPageAction('archive')">
                    <Archive class="size-4" />
                    Archive
                  </BaseButton>
                  <BaseButton variant="outline" @click="runPageAction('restore')">
                    <RefreshCw class="size-4" />
                    Restore
                  </BaseButton>
                  <BaseButton class="col-span-2" variant="danger" @click="runPageAction('delete')">
                    <Trash2 class="size-4" />
                    Delete page
                  </BaseButton>
                </div>
              </BaseCard>
            </div>
          </section>

          <section v-if="activeTab === 'content'" class="grid gap-5 xl:grid-cols-2">
            <BaseCard>
              <div class="mb-5 flex items-center gap-3">
                <FilePlus2 class="size-5 text-brand-500" />
                <h3 class="font-semibold text-gray-900 dark:text-white">Page sections</h3>
              </div>
              <form class="space-y-3" @submit.prevent="saveSection">
                <div class="grid gap-3 md:grid-cols-2">
                  <TextField
                    v-model="sectionForm.name"
                    name="section-name"
                    label="Section name"
                    placeholder="Hero utama"
                  />
                  <TextField
                    v-model="sectionForm.key"
                    name="section-key"
                    label="Section key"
                    placeholder="hero-main"
                  />
                  <TextField
                    v-model="sectionForm.type"
                    name="section-type-create"
                    label="Type"
                    placeholder="hero"
                  />
                </div>
                <div class="grid gap-3 md:grid-cols-2">
                  <label class="block">
                    <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >Content JSON</span
                    >
                    <textarea
                      v-model="sectionForm.content"
                      rows="4"
                      class="w-full rounded-lg border bg-white px-3.5 py-2.5 font-mono text-xs outline-none focus:border-brand-500 dark:bg-gray-950"
                      placeholder='{"headline":"..."}'
                    ></textarea>
                  </label>
                  <label class="block">
                    <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >Style JSON</span
                    >
                    <textarea
                      v-model="sectionForm.style"
                      rows="4"
                      class="w-full rounded-lg border bg-white px-3.5 py-2.5 font-mono text-xs outline-none focus:border-brand-500 dark:bg-gray-950"
                      placeholder='{"spacing":"normal"}'
                    ></textarea>
                  </label>
                </div>
                <div class="flex justify-end">
                  <BaseButton :disabled="!selectedPageId || saving">Create section</BaseButton>
                </div>
              </form>

              <div class="mt-5 divide-y rounded-lg border">
                <div
                  v-for="section in sections"
                  :key="section.id"
                  class="flex items-center justify-between gap-3 p-3"
                >
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {{ section.name }}
                    </p>
                    <p class="text-xs text-gray-500">
                      {{ section.type }} · #{{ section.key }} · order {{ section.sort_order }}
                    </p>
                  </div>
                  <div class="flex shrink-0 items-center gap-1">
                    <button
                      class="rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100"
                      @click="moveSection(section, -1)"
                    >
                      Up
                    </button>
                    <button
                      class="rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100"
                      @click="moveSection(section, 1)"
                    >
                      Down
                    </button>
                    <button
                      class="rounded-lg px-2 py-1 text-xs font-semibold"
                      :class="
                        section.is_enabled
                          ? 'text-emerald-700 hover:bg-emerald-50'
                          : 'text-gray-500 hover:bg-gray-100'
                      "
                      @click="toggleSection(section)"
                    >
                      {{ section.is_enabled ? 'Enabled' : 'Disabled' }}
                    </button>
                    <button
                      class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      @click="deleteSection(section.id)"
                    >
                      <Trash2 class="size-4" />
                    </button>
                  </div>
                </div>
                <div v-if="sections.length === 0" class="p-6 text-center text-sm text-gray-500">
                  Belum ada section.
                </div>
              </div>
            </BaseCard>

            <BaseCard>
              <div class="mb-5 flex items-center gap-3">
                <FormInput class="size-5 text-brand-500" />
                <h3 class="font-semibold text-gray-900 dark:text-white">Forms</h3>
              </div>
              <form class="space-y-3" @submit.prevent="saveLandingForm">
                <div class="grid gap-3 md:grid-cols-2">
                  <TextField
                    v-model="landingForm.name"
                    name="landing-form-name"
                    label="Form name"
                    placeholder="Lead consultation"
                  />
                  <TextField
                    v-model="landingForm.key"
                    name="landing-form-key"
                    label="Form key"
                    placeholder="lead-consultation"
                  />
                  <TextField
                    v-model="landingForm.submit_label"
                    name="submit-label"
                    label="Submit label"
                    placeholder="Kirim"
                  />
                  <TextField
                    v-model="landingForm.redirect_url"
                    name="redirect-url"
                    label="Redirect URL"
                    placeholder="https://..."
                  />
                </div>
                <TextField
                  v-model="landingForm.success_message"
                  name="success-message"
                  label="Success message"
                  placeholder="Terima kasih, kami akan menghubungi Anda."
                />
                <label class="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    v-model="landingForm.is_active"
                    type="checkbox"
                    class="size-4 rounded border-gray-300 text-brand-600"
                  />
                  Active form
                </label>
                <div class="flex justify-end">
                  <BaseButton :disabled="!selectedPageId || saving">Create form</BaseButton>
                </div>
              </form>

              <div class="mt-5 grid gap-3">
                <div v-for="form in forms" :key="form.id" class="rounded-lg border p-3">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="text-sm font-semibold text-gray-900 dark:text-white">
                        {{ form.name }}
                      </p>
                      <p class="text-xs text-gray-500">
                        {{ form.key }} · {{ form.is_active ? 'active' : 'inactive' }}
                      </p>
                    </div>
                    <button
                      class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      @click="deleteLandingForm(form.id)"
                    >
                      <Trash2 class="size-4" />
                    </button>
                  </div>
                </div>
                <div
                  v-if="forms.length === 0"
                  class="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500"
                >
                  Belum ada form.
                </div>
              </div>

              <form class="mt-5 space-y-3 rounded-lg border p-3" @submit.prevent="addFormField">
                <div class="grid gap-3 md:grid-cols-2">
                  <label class="block">
                    <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >Target form</span
                    >
                    <select
                      v-model="fieldForm.form_id"
                      class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
                    >
                      <option value="">Select form</option>
                      <option v-for="form in forms" :key="form.id" :value="form.id">
                        {{ form.name }}
                      </option>
                    </select>
                  </label>
                  <TextField
                    v-model="fieldForm.label"
                    name="field-label"
                    label="Field label"
                    placeholder="Nama lengkap"
                  />
                  <TextField
                    v-model="fieldForm.key"
                    name="field-key"
                    label="Field key"
                    placeholder="full_name"
                  />
                  <TextField
                    v-model="fieldForm.placeholder"
                    name="field-placeholder"
                    label="Placeholder"
                    placeholder="Masukkan nama"
                  />
                  <label class="block">
                    <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >Field type</span
                    >
                    <select
                      v-model="fieldForm.type"
                      class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
                    >
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="textarea">Textarea</option>
                    </select>
                  </label>
                  <label class="flex items-center gap-2 pt-7 text-sm font-medium text-gray-700">
                    <input
                      v-model="fieldForm.required"
                      type="checkbox"
                      class="size-4 rounded border-gray-300 text-brand-600"
                    />
                    Required
                  </label>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <p class="text-xs text-gray-500">
                    Current fields: {{ selectedFieldItems.length }}
                  </p>
                  <BaseButton :disabled="!fieldForm.form_id || saving">Add field</BaseButton>
                </div>
              </form>
            </BaseCard>

            <BaseCard>
              <div class="mb-5 flex items-center gap-3">
                <MousePointerClick class="size-5 text-brand-500" />
                <h3 class="font-semibold text-gray-900 dark:text-white">Call to actions</h3>
              </div>
              <form class="grid gap-3 md:grid-cols-2" @submit.prevent="saveCta">
                <TextField
                  v-model="ctaForm.name"
                  name="cta-name"
                  label="Name"
                  placeholder="Hero WhatsApp"
                />
                <TextField
                  v-model="ctaForm.label"
                  name="cta-label"
                  label="Button label"
                  placeholder="Konsultasi gratis"
                />
                <TextField
                  v-model="ctaForm.destination"
                  name="cta-destination"
                  label="Destination"
                  placeholder="https://..."
                />
                <TextField
                  v-model="ctaForm.tracking_key"
                  name="cta-tracking"
                  label="Tracking key"
                  placeholder="hero-primary"
                />
                <label class="block">
                  <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >Type</span
                  >
                  <select
                    v-model="ctaForm.type"
                    class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
                  >
                    <option value="contact_form">Contact form</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="external_link">External link</option>
                    <option value="internal_page">Internal page</option>
                    <option value="document_download">Document download</option>
                  </select>
                </label>
                <label class="block">
                  <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >Target</span
                  >
                  <select
                    v-model="ctaForm.target"
                    class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
                  >
                    <option value="self">Same tab</option>
                    <option value="new_tab">New tab</option>
                    <option value="modal">Modal</option>
                  </select>
                </label>
                <div class="md:col-span-2 flex justify-end">
                  <BaseButton :disabled="saving">Create CTA</BaseButton>
                </div>
              </form>

              <div class="mt-5 divide-y rounded-lg border">
                <div
                  v-for="cta in ctas"
                  :key="cta.id"
                  class="flex items-center justify-between gap-3 p-3"
                >
                  <div>
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">
                      {{ cta.label }}
                    </p>
                    <p class="text-xs text-gray-500">{{ cta.type }} · {{ cta.destination }}</p>
                  </div>
                  <button
                    class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    @click="deleteCta(cta.id)"
                  >
                    <Trash2 class="size-4" />
                  </button>
                </div>
                <div v-if="ctas.length === 0" class="p-6 text-center text-sm text-gray-500">
                  Belum ada CTA.
                </div>
              </div>
            </BaseCard>

            <BaseCard>
              <div class="mb-5 flex items-center gap-3">
                <FilePlus2 class="size-5 text-brand-500" />
                <h3 class="font-semibold text-gray-900 dark:text-white">Section templates</h3>
              </div>
              <form class="space-y-3" @submit.prevent="saveTemplate">
                <div class="grid gap-3 md:grid-cols-2">
                  <TextField
                    v-model="templateForm.name"
                    name="template-name"
                    label="Template name"
                    placeholder="Hero ISP"
                  />
                  <TextField
                    v-model="templateForm.section_type"
                    name="section-type"
                    label="Section type"
                    placeholder="hero"
                  />
                </div>
                <TextField
                  v-model="templateForm.description"
                  name="template-description"
                  label="Description"
                  placeholder="Section untuk campaign internet bisnis"
                />
                <div class="grid gap-3 md:grid-cols-2">
                  <label class="block">
                    <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >Content JSON</span
                    >
                    <textarea
                      v-model="templateForm.content"
                      rows="5"
                      class="w-full rounded-lg border bg-white px-3.5 py-2.5 font-mono text-xs outline-none focus:border-brand-500 dark:bg-gray-950"
                      placeholder='{"headline":"..."}'
                    ></textarea>
                  </label>
                  <label class="block">
                    <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >Style JSON</span
                    >
                    <textarea
                      v-model="templateForm.style"
                      rows="5"
                      class="w-full rounded-lg border bg-white px-3.5 py-2.5 font-mono text-xs outline-none focus:border-brand-500 dark:bg-gray-950"
                      placeholder='{"theme":"light"}'
                    ></textarea>
                  </label>
                </div>
                <div class="flex justify-end">
                  <BaseButton :disabled="saving">Create template</BaseButton>
                </div>
              </form>

              <div class="mt-5 grid gap-3">
                <div v-for="template in templates" :key="template.id" class="rounded-lg border p-3">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="text-sm font-semibold text-gray-900 dark:text-white">
                        {{ template.name }}
                      </p>
                      <p class="text-xs text-gray-500">
                        {{ template.section_type }} · {{ template.description || 'No description' }}
                      </p>
                    </div>
                    <BaseButton
                      variant="outline"
                      :disabled="!selectedPageId"
                      @click="instantiateTemplate(template)"
                    >
                      Add
                    </BaseButton>
                  </div>
                </div>
                <div
                  v-if="templates.length === 0"
                  class="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500"
                >
                  Belum ada template section.
                </div>
              </div>
            </BaseCard>
          </section>

          <section v-if="activeTab === 'seo'" class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <BaseCard>
              <div class="mb-5 flex items-center gap-3">
                <Globe2 class="size-5 text-brand-500" />
                <h3 class="font-semibold text-gray-900 dark:text-white">SEO metadata</h3>
              </div>
              <form class="space-y-4" @submit.prevent="saveSeo">
                <TextField
                  v-model="seoForm.meta_title"
                  name="meta-title"
                  label="Meta title"
                  placeholder="Internet Bisnis Cepat dan Stabil"
                />
                <label class="block">
                  <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >Meta description</span
                  >
                  <textarea
                    v-model="seoForm.meta_description"
                    rows="4"
                    class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
                  ></textarea>
                </label>
                <div class="grid gap-4 md:grid-cols-2">
                  <TextField v-model="seoForm.og_title" name="og-title" label="Open Graph title" />
                  <TextField
                    v-model="seoForm.canonical_url"
                    name="canonical-url"
                    label="Canonical URL"
                  />
                </div>
                <label class="block">
                  <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >Open Graph description</span
                  >
                  <textarea
                    v-model="seoForm.og_description"
                    rows="3"
                    class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
                  ></textarea>
                </label>
                <div class="flex justify-end">
                  <BaseButton :disabled="!selectedPageId || saving">Save SEO</BaseButton>
                </div>
              </form>
            </BaseCard>

            <BaseCard>
              <h3 class="font-semibold text-gray-900 dark:text-white">SEO readiness</h3>
              <div class="mt-5">
                <div class="h-3 rounded-full bg-gray-100">
                  <div
                    class="h-3 rounded-full bg-brand-500 transition-all"
                    :style="{ width: `${seoScore}%` }"
                  ></div>
                </div>
                <p class="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{{ seoScore }}%</p>
                <p class="mt-1 text-sm text-gray-500">
                  Score sederhana dari metadata, canonical URL, dan visibility.
                </p>
              </div>
            </BaseCard>
          </section>

          <section
            v-if="activeTab === 'branding'"
            class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"
          >
            <BaseCard>
              <div class="mb-5 flex items-center gap-3">
                <Brush class="size-5 text-brand-500" />
                <h3 class="font-semibold text-gray-900 dark:text-white">Page branding override</h3>
              </div>
              <form class="space-y-4" @submit.prevent="saveBranding">
                <div class="grid gap-4 md:grid-cols-2">
                  <TextField
                    v-model="brandingForm.company_name"
                    name="brand-company"
                    label="Company name"
                    placeholder="Zyad Cloud"
                  />
                  <TextField
                    v-model="brandingForm.tagline"
                    name="brand-tagline"
                    label="Tagline"
                    placeholder="Internet cepat untuk bisnis"
                  />
                  <TextField
                    v-model="brandingForm.logo_light_url"
                    name="logo-light"
                    label="Logo light URL"
                    placeholder="https://..."
                  />
                  <TextField
                    v-model="brandingForm.logo_dark_url"
                    name="logo-dark"
                    label="Logo dark URL"
                    placeholder="https://..."
                  />
                  <TextField
                    v-model="brandingForm.favicon_url"
                    name="favicon-url"
                    label="Favicon URL"
                    placeholder="https://..."
                  />
                  <TextField
                    v-model="brandingForm.social_image_url"
                    name="social-image-url"
                    label="Social image URL"
                    placeholder="https://..."
                  />
                </div>
                <div class="grid gap-4 md:grid-cols-3">
                  <label class="block">
                    <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >Colors JSON</span
                    >
                    <textarea
                      v-model="brandingForm.colors"
                      rows="6"
                      class="w-full rounded-lg border bg-white px-3.5 py-2.5 font-mono text-xs outline-none focus:border-brand-500 dark:bg-gray-950"
                      placeholder='{"primary":"#2563eb"}'
                    ></textarea>
                  </label>
                  <label class="block">
                    <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >Typography JSON</span
                    >
                    <textarea
                      v-model="brandingForm.typography"
                      rows="6"
                      class="w-full rounded-lg border bg-white px-3.5 py-2.5 font-mono text-xs outline-none focus:border-brand-500 dark:bg-gray-950"
                      placeholder='{"heading_font":"Inter"}'
                    ></textarea>
                  </label>
                  <label class="block">
                    <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >Contact JSON</span
                    >
                    <textarea
                      v-model="brandingForm.contact"
                      rows="6"
                      class="w-full rounded-lg border bg-white px-3.5 py-2.5 font-mono text-xs outline-none focus:border-brand-500 dark:bg-gray-950"
                      placeholder='{"email":"hello@example.com"}'
                    ></textarea>
                  </label>
                </div>
                <div class="flex flex-wrap justify-end gap-2">
                  <BaseButton
                    type="button"
                    variant="outline"
                    :disabled="!selectedPageId || saving"
                    @click="removeBrandingOverride"
                  >
                    Remove override
                  </BaseButton>
                  <BaseButton :disabled="!selectedPageId || saving">Save branding</BaseButton>
                </div>
              </form>
            </BaseCard>

            <BaseCard>
              <h3 class="font-semibold text-gray-900 dark:text-white">Effective branding</h3>
              <div class="mt-5 space-y-3 text-sm">
                <div class="rounded-lg border p-3">
                  <p class="text-xs font-semibold uppercase text-gray-400">Company</p>
                  <p class="mt-1 font-semibold text-gray-900 dark:text-white">
                    {{ pageBranding?.company_name || '-' }}
                  </p>
                  <p class="text-gray-500">{{ pageBranding?.tagline || '-' }}</p>
                </div>
                <div class="rounded-lg border p-3">
                  <p class="text-xs font-semibold uppercase text-gray-400">Assets</p>
                  <p class="mt-1 break-all text-gray-500">
                    Logo: {{ pageBranding?.logo_light_url || '-' }}
                  </p>
                  <p class="break-all text-gray-500">
                    Social: {{ pageBranding?.social_image_url || '-' }}
                  </p>
                </div>
              </div>
            </BaseCard>
          </section>

          <section
            v-if="activeTab === 'domains'"
            class="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
          >
            <BaseCard>
              <div class="mb-5 flex items-center gap-3">
                <Link2 class="size-5 text-brand-500" />
                <h3 class="font-semibold text-gray-900 dark:text-white">Bind domain</h3>
              </div>
              <form class="space-y-3" @submit.prevent="saveDomainBinding">
                <label class="block">
                  <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >Available domain</span
                  >
                  <select
                    v-model="domainForm.organization_domain_id"
                    class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
                  >
                    <option value="">Select verified domain</option>
                    <option v-for="domain in availableDomains" :key="domain.id" :value="domain.id">
                      {{ domainLabel(domain) }}
                    </option>
                  </select>
                </label>
                <label class="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    v-model="domainForm.is_primary"
                    type="checkbox"
                    class="size-4 rounded border-gray-300 text-brand-600"
                  />
                  Set as primary
                </label>
                <BaseButton
                  class="w-full"
                  :disabled="!selectedPageId || !domainForm.organization_domain_id || saving"
                >
                  Bind domain
                </BaseButton>
              </form>
              <div
                v-if="availableDomains.length === 0"
                class="mt-5 rounded-lg border border-dashed p-6 text-center text-sm text-gray-500"
              >
                Belum ada domain verified yang tersedia dari Organization Domain.
              </div>
            </BaseCard>

            <BaseCard>
              <div class="mb-5 flex items-center gap-3">
                <Globe2 class="size-5 text-brand-500" />
                <h3 class="font-semibold text-gray-900 dark:text-white">Domain bindings</h3>
              </div>
              <div class="divide-y rounded-lg border">
                <div
                  v-for="binding in domainBindings"
                  :key="binding.id"
                  class="flex items-center justify-between gap-3 p-3"
                >
                  <div>
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">
                      {{ binding.organization_domain_id }}
                    </p>
                    <p class="text-xs text-gray-500">
                      {{ binding.is_primary ? 'Primary domain' : 'Secondary domain' }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <BaseButton
                      v-if="!binding.is_primary"
                      variant="outline"
                      @click="setPrimaryDomain(binding)"
                    >
                      Set primary
                    </BaseButton>
                    <button
                      class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      @click="deleteDomainBinding(binding.id)"
                    >
                      <Trash2 class="size-4" />
                    </button>
                  </div>
                </div>
                <div
                  v-if="domainBindings.length === 0"
                  class="p-6 text-center text-sm text-gray-500"
                >
                  Belum ada domain binding untuk page ini.
                </div>
              </div>
            </BaseCard>
          </section>

          <section v-if="activeTab === 'media'" class="space-y-5">
            <BaseCard>
              <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 class="font-semibold text-gray-900 dark:text-white">Media library</h3>
                  <p class="text-sm text-gray-500">Upload dan kelola asset visual landing page.</p>
                </div>
                <label
                  class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
                >
                  <Upload class="size-4" />
                  Upload media
                  <input type="file" class="hidden" @change="uploadMedia" />
                </label>
              </div>
            </BaseCard>

            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <BaseCard v-for="media in mediaItems" :key="media.id">
                <div
                  class="mb-4 flex h-32 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-950"
                >
                  <Image class="size-8 text-gray-400" />
                </div>
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {{ media.filename }}
                    </p>
                    <p class="mt-1 text-xs text-gray-500">
                      {{ media.mime_type }} · {{ formatBytes(media.size_bytes) }}
                    </p>
                  </div>
                  <button
                    class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    @click="deleteMedia(media.id)"
                  >
                    <Trash2 class="size-4" />
                  </button>
                </div>
              </BaseCard>
              <div
                v-if="mediaItems.length === 0"
                class="rounded-xl border border-dashed bg-white p-10 text-center text-sm text-gray-500 dark:bg-gray-900 md:col-span-2 xl:col-span-3"
              >
                Media library masih kosong.
              </div>
            </div>
          </section>

          <section
            v-if="activeTab === 'navigation'"
            class="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
          >
            <BaseCard>
              <div class="mb-5 flex items-center gap-3">
                <Menu class="size-5 text-brand-500" />
                <h3 class="font-semibold text-gray-900 dark:text-white">Menus</h3>
              </div>
              <form class="space-y-3" @submit.prevent="saveMenu">
                <TextField
                  v-model="menuForm.name"
                  name="menu-name"
                  label="Menu name"
                  placeholder="Main navigation"
                />
                <TextField
                  v-model="menuForm.location"
                  name="menu-location"
                  label="Location"
                  placeholder="header"
                />
                <label class="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    v-model="menuForm.is_active"
                    type="checkbox"
                    class="size-4 rounded border-gray-300 text-brand-600"
                  />
                  Active menu
                </label>
                <div class="grid gap-2 sm:grid-cols-2">
                  <BaseButton type="submit" class="w-full" :disabled="saving">
                    {{ editingMenuId ? 'Update menu' : 'Create menu' }}
                  </BaseButton>
                  <BaseButton
                    type="button"
                    variant="outline"
                    :disabled="saving"
                    @click="resetMenuForm"
                  >
                    Clear
                  </BaseButton>
                </div>
              </form>

              <div class="mt-5 space-y-2">
                <div
                  v-for="menuEntry in menus"
                  :key="menuEntry.id"
                  class="w-full rounded-lg border p-3 text-left text-sm transition hover:bg-brand-50"
                  :class="
                    selectedMenuId === menuEntry.id
                      ? 'border-brand-400 bg-brand-50'
                      : 'border-gray-200'
                  "
                >
                  <button class="block w-full text-left" @click="selectMenu(menuEntry.id)">
                    <span class="block font-semibold text-gray-900 dark:text-white">{{
                      menuEntry.name
                    }}</span>
                    <span class="text-xs text-gray-500"
                      >{{ menuEntry.location }} ·
                      {{ menuEntry.is_active ? 'active' : 'inactive' }}</span
                    >
                  </button>
                  <div class="mt-3 flex flex-wrap gap-2">
                    <BaseButton type="button" variant="outline" @click="editMenu(menuEntry)">
                      Edit
                    </BaseButton>
                    <BaseButton type="button" variant="outline" @click="toggleMenu(menuEntry)">
                      {{ menuEntry.is_active ? 'Disable' : 'Enable' }}
                    </BaseButton>
                    <button
                      class="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                      @click="deleteMenu(menuEntry.id)"
                    >
                      <Trash2 class="size-4" />
                    </button>
                  </div>
                </div>
                <div
                  v-if="menus.length === 0"
                  class="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500"
                >
                  {{ navigationCapabilityMessage || 'Belum ada menu.' }}
                </div>
              </div>
            </BaseCard>

            <BaseCard>
              <div class="mb-5 flex items-center gap-3">
                <Link2 class="size-5 text-brand-500" />
                <h3 class="font-semibold text-gray-900 dark:text-white">
                  Menu items{{ selectedMenu ? ` · ${selectedMenu.name}` : '' }}
                </h3>
              </div>
              <form class="grid gap-3 md:grid-cols-2" @submit.prevent="saveMenuItem">
                <TextField
                  v-model="menuItemForm.label"
                  name="menu-item-label"
                  label="Label"
                  placeholder="Pricing"
                />
                <TextField
                  v-model="menuItemForm.destination"
                  name="menu-item-destination"
                  label="Destination"
                  placeholder="#pricing"
                />
                <label class="block">
                  <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >Link type</span
                  >
                  <select
                    v-model="menuItemForm.link_type"
                    class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
                  >
                    <option value="internal_page">Internal page</option>
                    <option value="external_link">External link</option>
                    <option value="anchor">Anchor</option>
                    <option value="button">Button</option>
                  </select>
                </label>
                <label class="block">
                  <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >Parent item</span
                  >
                  <select
                    v-model="menuItemForm.parent_id"
                    class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
                  >
                    <option value="">Root item</option>
                    <option
                      v-for="item in selectedMenuItems.filter(
                        (entry) => entry.id !== editingMenuItemId,
                      )"
                      :key="item.id"
                      :value="item.id"
                    >
                      {{ item.label }}
                    </option>
                  </select>
                </label>
                <label class="block">
                  <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >Target</span
                  >
                  <select
                    v-model="menuItemForm.target"
                    class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
                  >
                    <option value="self">Same tab</option>
                    <option value="new_tab">New tab</option>
                  </select>
                </label>
                <label class="flex items-center gap-2 pt-7 text-sm font-medium text-gray-700">
                  <input
                    v-model="menuItemForm.is_enabled"
                    type="checkbox"
                    class="size-4 rounded border-gray-300 text-brand-600"
                  />
                  Enabled item
                </label>
                <div class="md:col-span-2 flex justify-end gap-2">
                  <BaseButton
                    type="button"
                    variant="outline"
                    :disabled="saving"
                    @click="resetMenuItemForm"
                  >
                    Clear
                  </BaseButton>
                  <BaseButton type="submit" :disabled="!selectedMenuId || saving">
                    {{ editingMenuItemId ? 'Update item' : 'Add item' }}
                  </BaseButton>
                </div>
              </form>

              <div class="mt-5 divide-y rounded-lg border">
                <div
                  v-for="item in selectedMenuItems"
                  :key="item.id"
                  class="flex items-center justify-between gap-3 p-3"
                >
                  <div>
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">
                      {{ item.label }}
                    </p>
                    <p class="text-xs text-gray-500">
                      {{ item.link_type }} · {{ item.destination }} ·
                      {{ item.is_enabled ? 'enabled' : 'disabled' }}
                    </p>
                  </div>
                  <div class="flex shrink-0 flex-wrap justify-end gap-1">
                    <button
                      class="rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100"
                      @click="moveMenuItem(item, -1)"
                    >
                      Up
                    </button>
                    <button
                      class="rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100"
                      @click="moveMenuItem(item, 1)"
                    >
                      Down
                    </button>
                    <button
                      class="rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100"
                      @click="editMenuItem(item)"
                    >
                      Edit
                    </button>
                    <button
                      class="rounded-lg px-2 py-1 text-xs font-semibold"
                      :class="
                        item.is_enabled
                          ? 'text-emerald-700 hover:bg-emerald-50'
                          : 'text-gray-500 hover:bg-gray-100'
                      "
                      @click="toggleMenuItem(item)"
                    >
                      {{ item.is_enabled ? 'Enabled' : 'Disabled' }}
                    </button>
                    <button
                      class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      @click="deleteMenuItem(item.id)"
                    >
                      <Trash2 class="size-4" />
                    </button>
                  </div>
                </div>
                <div
                  v-if="selectedMenuItems.length === 0"
                  class="p-6 text-center text-sm text-gray-500"
                >
                  Pilih menu lalu tambahkan item.
                </div>
              </div>
            </BaseCard>
          </section>

          <section v-if="activeTab === 'integrations'" class="grid gap-5 xl:grid-cols-2">
            <BaseCard>
              <div class="mb-5 flex items-center gap-3">
                <PlugZap class="size-5 text-brand-500" />
                <h3 class="font-semibold text-gray-900 dark:text-white">Lead integrations</h3>
              </div>
              <form class="space-y-3" @submit.prevent="saveIntegration">
                <div class="grid gap-3 md:grid-cols-2">
                  <TextField
                    v-model="integrationForm.name"
                    name="integration-name"
                    label="Name"
                    placeholder="CRM Webhook"
                  />
                  <TextField
                    v-model="integrationForm.type"
                    name="integration-type"
                    label="Type"
                    placeholder="webhook"
                  />
                </div>
                <TextField
                  v-model="integrationForm.endpoint_url"
                  name="endpoint-url"
                  label="Endpoint URL"
                  placeholder="https://..."
                />
                <TextField
                  v-model="integrationForm.event_filters"
                  name="event-filters"
                  label="Event filters"
                  placeholder="lead_submitted,form_submitted"
                />
                <label class="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    v-model="integrationForm.is_active"
                    type="checkbox"
                    class="size-4 rounded border-gray-300 text-brand-600"
                  />
                  Active integration
                </label>
                <BaseButton :disabled="saving">Create integration</BaseButton>
              </form>

              <div class="mt-5 divide-y rounded-lg border">
                <div
                  v-for="integration in integrations"
                  :key="integration.id"
                  class="flex items-center justify-between gap-3 p-3"
                >
                  <div>
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">
                      {{ integration.name }}
                    </p>
                    <p class="text-xs text-gray-500">
                      {{ integration.type }} · {{ integration.is_active ? 'active' : 'inactive' }}
                    </p>
                  </div>
                  <BaseButton variant="outline" @click="testIntegration(integration.id)"
                    >Test</BaseButton
                  >
                </div>
                <div v-if="integrations.length === 0" class="p-6 text-center text-sm text-gray-500">
                  Belum ada integration.
                </div>
              </div>
            </BaseCard>

            <BaseCard>
              <div class="mb-5 flex items-center gap-3">
                <FormInput class="size-5 text-brand-500" />
                <h3 class="font-semibold text-gray-900 dark:text-white">Lead delivery log</h3>
              </div>
              <div class="divide-y rounded-lg border">
                <div
                  v-for="delivery in deliveries"
                  :key="delivery.id"
                  class="flex items-center justify-between gap-3 p-3"
                >
                  <div>
                    <p class="text-sm font-semibold capitalize text-gray-900 dark:text-white">
                      {{ delivery.status }}
                    </p>
                    <p class="text-xs text-gray-500">
                      Attempts {{ delivery.attempts }} · {{ formatDate(delivery.created_at) }}
                    </p>
                    <p v-if="delivery.error_message" class="mt-1 text-xs text-red-600">
                      {{ delivery.error_message }}
                    </p>
                  </div>
                  <BaseButton variant="outline" @click="retryDelivery(delivery.id)"
                    >Retry</BaseButton
                  >
                </div>
                <div v-if="deliveries.length === 0" class="p-6 text-center text-sm text-gray-500">
                  {{ deliveryCapabilityMessage || 'Belum ada delivery log.' }}
                </div>
              </div>
            </BaseCard>
          </section>

          <section v-if="activeTab === 'history'" class="space-y-5">
            <BaseCard>
              <div class="flex items-center justify-between gap-4">
                <div>
                  <h3 class="font-semibold text-gray-900 dark:text-white">Revision history</h3>
                  <p class="text-sm text-gray-500">
                    Pulihkan snapshot halaman jika publish atau edit perlu rollback.
                  </p>
                </div>
                <Loader2 v-if="sectionLoading" class="size-5 animate-spin text-brand-500" />
              </div>
            </BaseCard>

            <div class="grid gap-3">
              <BaseCard v-for="revision in revisions" :key="revision.id">
                <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">
                      Revision {{ revision.revision_number ?? revision.version ?? revision.id }}
                    </p>
                    <p class="mt-1 text-xs text-gray-500">
                      {{ revision.change_note || 'Snapshot halaman' }} ·
                      {{ formatDate(revision.created_at) }}
                    </p>
                  </div>
                  <BaseButton variant="outline" @click="restoreRevision(revision)">
                    <RefreshCw class="size-4" />
                    Restore
                  </BaseButton>
                </div>
              </BaseCard>
              <div
                v-if="revisions.length === 0"
                class="rounded-xl border border-dashed bg-white p-10 text-center text-sm text-gray-500 dark:bg-gray-900"
              >
                Belum ada revision history.
              </div>
            </div>
          </section>
        </template>
      </main>
    </div>
  </div>
</template>
