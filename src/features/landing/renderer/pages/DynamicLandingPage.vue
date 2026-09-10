<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { http } from '@/lib/http'
import { normalizeBranding } from '../../shared/api/landing.api'
import LandingPageRenderer from '../components/LandingPageRenderer.vue'
import { useFooterContent } from '../composables/useFooterContent'
import type {
  FooterContent,
  LandingBranding,
  LandingPage,
  LandingSection,
} from '../../shared/types/landing.types'

/**
 * DynamicLandingPage
 *
 * Halaman public yang membaca slug dari route, memanggil API backend,
 * lalu merender landing page menggunakan LandingPageRenderer.
 *
 * Flow:
 *   Route slug → GET /public/landing/resolve?slug=<slug> → LandingPageRenderer
 *   Tanpa slug (mis. root path di domain tenant) → GET /public/landing/resolve
 *   tanpa slug → backend resolve berdasarkan Host header (domain binding).
 *
 * Props: slug bisa dari route param (:slug) atau prop langsung.
 */

const props = defineProps<{
  /** Override slug jika tidak dari route. Kosongkan untuk resolve berdasarkan Host header. */
  slug?: string
}>()

const emit = defineEmits<{
  (event: 'landing-navigation', items: NavItem[]): void
  (event: 'landing-branding', branding: LandingBranding): void
  /** 'section' when the page carries its own header section — the layout hides its nav. */
  (event: 'landing-header-mode', mode: 'section' | 'layout'): void
}>()

type NavItem = {
  id?: string
  label: string
  href: string
  target?: string
  children?: NavItem[]
}

type RawRecord = Record<string, unknown>

const route = useRoute()
const loading = ref(true)
const error = ref<string | null>(null)

const sections = ref<LandingSection[]>([])
const pageData = ref<Partial<LandingPage>>({
  id: '',
  title: '',
  slug: '',
})
// Data footer diturunkan dari branding + menu location=footer + page.settings —
// section type "footer" tidak diedit langsung sebagai konten mentah (lihat
// menu Content/Settings), tapi otomatis diisi di sini supaya logo, link, dan
// copyright selalu sinkron dengan pengaturan tenant, bukan fallback platform.
const footerContent = ref<FooterContent>({
  brandName: '',
  columns: [],
  copyright: '',
})

// Synthesized header data (tenant menu items + branding) injected into the
// `header` section at render time — same pattern as footerContent.
const headerChrome = ref<{
  items: NavItem[]
  brandName: string
  brandLogoUrl: string
  brandLogoDarkUrl: string
}>({
  items: [],
  brandName: '',
  brandLogoUrl: '',
  brandLogoDarkUrl: '',
})

const resolvedSlug = computed(() => props.slug ?? (route.params.slug as string) ?? '')

onMounted(async () => {
  await fetchPage(resolvedSlug.value)
})

async function fetchPage(slug: string) {
  loading.value = true
  error.value = null
  try {
    const res = await http.get<{ data: RawRecord } | RawRecord>(
      slug ? `/public/landing/resolve?slug=${slug}` : '/public/landing/resolve',
    )
    const result: RawRecord = (res.data as { data?: RawRecord }).data ?? (res.data as RawRecord)
    const rawPage = pickObject(result, 'Page', 'page')

    sections.value = normalizeSections(resolveSectionsPayload(result))
    pageData.value = {
      id: pickString(rawPage, 'id', 'ID'),
      title: pickString(rawPage, 'title', 'Title', 'name', 'Name'),
      name: pickString(rawPage, 'name', 'Name', 'title', 'Title'),
      slug: pickString(rawPage, 'slug', 'Slug') || slug,
    }

    const rawMenus = pickArray(result, 'Menus', 'menus')
    const menus = normalizeMenus(rawMenus)
    const headerNav = getHeaderNavigation(menus)
    emit('landing-navigation', headerNav)

    const rawBranding = pickObject(result, 'Branding', 'branding')
    const branding = normalizeBranding(rawBranding)
    emit('landing-branding', branding)

    // A page with its own `header` section renders the nav itself (sticky), so
    // the shared MarketingLayout must not stack its own <nav> on top.
    const hasHeaderSection = sections.value.some((s) => s.type === 'header')
    emit('landing-header-mode', hasHeaderSection ? 'section' : 'layout')
    headerChrome.value = {
      items: headerNav,
      brandName: branding.company_name ?? '',
      brandLogoUrl: branding.logo_light_url ?? '',
      brandLogoDarkUrl: branding.logo_dark_url ?? '',
    }

    footerContent.value = useFooterContent(result, pageData.value.title ?? '')
  } catch (err) {
    console.error('DynamicLandingPage: failed to load page', err)
    error.value = 'Halaman tidak dapat dimuat. Silakan coba beberapa saat lagi.'
  } finally {
    loading.value = false
  }
}

// ─── Normalize helpers ───────────────────────────────────────────────────────

function resolveSectionsPayload(result: RawRecord): RawRecord[] {
  const directSections = pickArray(result, 'Sections', 'sections')
  if (directSections.length > 0) return directSections

  const snapshot = pickObject(result, 'Snapshot', 'snapshot')
  return pickArray(snapshot, 'sections', 'Sections')
}

function normalizeSections(rawSections: RawRecord[]): LandingSection[] {
  return rawSections.map((section) => ({
    id: pickString(section, 'id', 'ID'),
    key: pickString(section, 'key', 'Key', 'section_key', 'SectionKey'),
    type: pickString(section, 'type', 'Type', 'section_type', 'SectionType'),
    name: pickString(section, 'name', 'Name'),
    sort_order: pickNumber(section, 'sort_order', 'SortOrder'),
    is_enabled: pickBoolean(section, ['is_enabled', 'IsEnabled'], true),
    content: pickObject(section, 'content', 'Content'),
    style: pickObject(section, 'style', 'Style'),
    created_at: pickString(section, 'created_at', 'CreatedAt'),
    updated_at: pickString(section, 'updated_at', 'UpdatedAt'),
    variant: pickString(section, 'variant', 'Variant') || undefined,
  }))
}

type RawMenuItem = {
  id: string
  label: string
  link_type: string
  destination: string
  target: string
  sort_order: number
  is_enabled: boolean
  children?: RawMenuItem[]
}

type RawMenu = {
  id: string
  name: string
  location: string
  is_active: boolean
  items: RawMenuItem[]
}

function normalizeMenus(rawMenus: RawRecord[]): RawMenu[] {
  return rawMenus.map((menu) => ({
    id: pickString(menu, 'id', 'ID'),
    name: pickString(menu, 'name', 'Name'),
    location: pickString(menu, 'location', 'Location'),
    is_active: pickBoolean(menu, ['is_active', 'IsActive'], true),
    items: normalizeMenuItems(pickArray(menu, 'items', 'Items')),
  }))
}

function normalizeMenuItems(rawItems: RawRecord[]): RawMenuItem[] {
  return rawItems
    .map((item) => ({
      id: pickString(item, 'id', 'ID'),
      label: pickString(item, 'label', 'Label'),
      link_type: pickString(item, 'link_type', 'LinkType'),
      destination: pickString(item, 'destination', 'Destination'),
      target: pickString(item, 'target', 'Target') || 'self',
      sort_order: pickNumber(item, 'sort_order', 'SortOrder'),
      is_enabled: pickBoolean(item, ['is_enabled', 'IsEnabled'], true),
      children: normalizeMenuItems(pickArray(item, 'children', 'Children')),
    }))
    .filter((item) => item.is_enabled)
    .sort((a, b) => a.sort_order - b.sort_order)
}

function getHeaderNavigation(menuList: RawMenu[]): NavItem[] {
  const headerMenu = menuList.find(
    (menu) => menu.location === 'header' && menu.is_active && menu.items.length > 0,
  )
  return headerMenu?.items.map(toNavItem) ?? []
}

function toNavItem(item: RawMenuItem): NavItem {
  const dest = normalizeNavigationDestination(item)
  return {
    id: item.id,
    label: item.label,
    href: dest,
    target: item.target,
    children: item.children?.map(toNavItem),
  }
}

function normalizeNavigationDestination(item: RawMenuItem) {
  const destination = item.destination.trim()
  if (item.link_type === 'anchor') {
    return destination.startsWith('#') ? destination : `#${destination}`
  }
  if (item.link_type === 'internal_page' || item.link_type === 'button') {
    if (!destination || destination === 'public-marketing') return '/'
    return destination.startsWith('/') ? destination : `/${destination}`
  }
  return destination || '#'
}

// ─── Raw record helpers ───────────────────────────────────────────────────────

function pickString(record: RawRecord, ...keys: string[]): string {
  for (const key of keys) {
    const val = record?.[key]
    if (typeof val === 'string' && val) return val
  }
  return ''
}

function pickNumber(record: RawRecord, ...keys: string[]): number {
  for (const key of keys) {
    const val = record?.[key]
    if (typeof val === 'number') return val
  }
  return 0
}

function pickBoolean(record: RawRecord, keys: string[], fallback: boolean): boolean {
  for (const key of keys) {
    const val = record?.[key]
    if (typeof val === 'boolean') return val
  }
  return fallback
}

function pickObject(record: RawRecord, ...keys: string[]): Record<string, unknown> {
  for (const key of keys) {
    const val = record?.[key]
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return val as Record<string, unknown>
    }
  }
  return {}
}

function pickArray(record: RawRecord, ...keys: string[]): RawRecord[] {
  for (const key of keys) {
    const val = record?.[key]
    if (Array.isArray(val)) return val as RawRecord[]
  }
  return []
}
</script>

<template>
  <div>
    <!-- Loading state -->
    <div v-if="loading" class="min-h-screen flex items-center justify-center bg-surface">
      <div class="flex flex-col items-center gap-4">
        <div
          class="w-12 h-12 rounded-full border-4 border-secondary border-t-transparent animate-spin"
        ></div>
        <span class="text-xs text-on-surface-variant">Memuat Halaman...</span>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="min-h-screen flex items-center justify-center">
      <div class="max-w-md text-center px-6">
        <p class="text-lg font-semibold text-gray-900 dark:text-gray-100">Halaman tidak tersedia</p>
        <p class="mt-2 text-sm text-gray-500">{{ error }}</p>
      </div>
    </div>

    <!-- Render sections via LandingPageRenderer -->
    <LandingPageRenderer
      v-else
      :page="pageData as LandingPage"
      :sections="sections"
      :footer-content="footerContent"
      :header-chrome="headerChrome"
    />
  </div>
</template>
