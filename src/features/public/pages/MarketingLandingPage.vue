<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { http } from '@/lib/http'

import HeroSection from '../components/HeroSection.vue'
import ProblemSection from '../components/ProblemSection.vue'
import SolutionSection from '../components/SolutionSection.vue'
import ServicesSection from '../components/ServicesSection.vue'
import BenefitsSection from '../components/BenefitsSection.vue'
import DemoSection from '../components/DemoSection.vue'
import FaqSection from '../components/FaqSection.vue'
import CtaSection from '../components/CtaSection.vue'
import LandingFooter from '../components/LandingFooter.vue'

type PublicSection = {
  id: string
  key: string
  type: string
  name: string
  sort_order: number
  is_enabled: boolean
  content: Record<string, unknown>
}

type PublicMenuItem = {
  id: string
  label: string
  link_type: string
  destination: string
  target: string
  sort_order: number
  is_enabled: boolean
  children?: PublicMenuItem[]
}

type RawRecord = Record<string, unknown>

type PublicMenu = {
  id: string
  name: string
  location: string
  is_active: boolean
  items: PublicMenuItem[]
}

type MarketingNavItem = {
  id?: string
  label: string
  href: string
  target?: string
  children?: MarketingNavItem[]
}

const emit = defineEmits<{
  (event: 'landing-navigation', items: MarketingNavItem[]): void
}>()

const sections = ref<PublicSection[]>([])
const menus = ref<PublicMenu[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await http.get('/public/landing/resolve?slug=public-marketing')
    const result = res.data?.data || res.data
    sections.value = normalizeSections(result.Sections || result.sections || [])
    menus.value = normalizeMenus(result.Menus || result.menus || [])
    emit('landing-navigation', getHeaderNavigation(menus.value))
  } catch (error) {
    console.error('Failed to load landing page data', error)
  } finally {
    loading.value = false
  }
})

const sectionComponents = {
  hero: HeroSection,
  content: ProblemSection,
  services: SolutionSection,
  features: ServicesSection,
  portfolio: DemoSection,
  faq: FaqSection,
  cta: CtaSection,
  footer: LandingFooter,
}

const sectionComponentByKey: Record<string, unknown> = {
  'hero-section': HeroSection,
  'problem-section': ProblemSection,
  'solution-section': SolutionSection,
  'services-section': ServicesSection,
  'benefits-section': BenefitsSection,
  'demo-section': DemoSection,
  'faq-section': FaqSection,
  'cta-section': CtaSection,
  'footer-section': LandingFooter,
}

const visibleSections = computed(() =>
  [...sections.value]
    .filter((section) => section.is_enabled)
    .sort((a, b) => a.sort_order - b.sort_order),
)

function normalizeSections(rawSections: RawRecord[]): PublicSection[] {
  return rawSections.map((section) => ({
    id: stringValue(section, 'id', 'ID'),
    key: stringValue(section, 'key', 'Key', 'section_key', 'SectionKey'),
    type: stringValue(section, 'type', 'Type', 'section_type', 'SectionType'),
    name: stringValue(section, 'name', 'Name'),
    sort_order: numberValue(section, 'sort_order', 'SortOrder'),
    is_enabled: booleanValue(section, 'is_enabled', 'IsEnabled', true),
    content: objectValue(section, 'content', 'Content'),
  }))
}

function normalizeMenus(rawMenus: RawRecord[]): PublicMenu[] {
  return rawMenus.map((menu) => ({
    id: stringValue(menu, 'id', 'ID'),
    name: stringValue(menu, 'name', 'Name'),
    location: stringValue(menu, 'location', 'Location'),
    is_active: booleanValue(menu, 'is_active', 'IsActive', true),
    items: normalizeMenuItems(arrayValue(menu, 'items', 'Items')),
  }))
}

function normalizeMenuItems(rawItems: RawRecord[]): PublicMenuItem[] {
  return rawItems
    .map((item) => ({
      id: stringValue(item, 'id', 'ID'),
      label: stringValue(item, 'label', 'Label'),
      link_type: stringValue(item, 'link_type', 'LinkType'),
      destination: stringValue(item, 'destination', 'Destination'),
      target: stringValue(item, 'target', 'Target', 'self'),
      sort_order: numberValue(item, 'sort_order', 'SortOrder'),
      is_enabled: booleanValue(item, 'is_enabled', 'IsEnabled', true),
      children: normalizeMenuItems(arrayValue(item, 'children', 'Children')),
    }))
    .filter((item) => item.is_enabled)
    .sort((a, b) => a.sort_order - b.sort_order)
}

function getHeaderNavigation(menuList: PublicMenu[]): MarketingNavItem[] {
  const headerMenu = menuList.find(
    (menu) => menu.location === 'header' && menu.is_active && menu.items.length > 0,
  )
  return headerMenu?.items.map(toNavigationItem) ?? []
}

function toNavigationItem(item: PublicMenuItem): MarketingNavItem {
  return {
    id: item.id,
    label: item.label,
    href: normalizeDestination(item),
    target: item.target,
    children: item.children?.map(toNavigationItem),
  }
}

function normalizeDestination(item: PublicMenuItem): string {
  if (item.link_type === 'anchor') {
    return item.destination.startsWith('#') ? item.destination : `#${item.destination}`
  }
  return item.destination || '#'
}

function resolveSectionComponent(section: PublicSection) {
  return (
    sectionComponentByKey[section.key] ||
    sectionComponents[section.type as keyof typeof sectionComponents]
  )
}

function stringValue(record: RawRecord, ...keys: string[]): string {
  const value = pickValue(record, keys)
  return typeof value === 'string' ? value : ''
}

function numberValue(record: RawRecord, ...keys: string[]): number {
  const value = pickValue(record, keys)
  return typeof value === 'number' ? value : 0
}

function booleanValue(record: RawRecord, ...keysAndFallback: [...string[], boolean]): boolean {
  const fallback = keysAndFallback[keysAndFallback.length - 1] as boolean
  const keys = keysAndFallback.slice(0, -1) as string[]
  const value = pickValue(record, keys)
  return typeof value === 'boolean' ? value : fallback
}

function objectValue(record: RawRecord, ...keys: string[]): Record<string, unknown> {
  const value = pickValue(record, keys)
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function arrayValue(record: RawRecord, ...keys: string[]): RawRecord[] {
  const value = pickValue(record, keys)
  return Array.isArray(value) ? (value as RawRecord[]) : []
}

function pickValue(record: RawRecord, keys: string[]): unknown {
  for (const key of keys) {
    const value = record?.[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}
</script>

<template>
  <div>
    <div v-if="loading" class="min-h-screen flex items-center justify-center bg-surface">
      <div class="flex flex-col items-center gap-4">
        <div
          class="w-12 h-12 rounded-full border-4 border-secondary border-t-transparent animate-spin"
        ></div>
        <span class="font-label-sm text-label-sm text-on-surface-variant text-xs"
          >Memuat Halaman...</span
        >
      </div>
    </div>
    <div v-else>
      <component
        :is="resolveSectionComponent(section)"
        v-for="section in visibleSections"
        :key="section.id || section.key"
        :content="section.content"
      />
    </div>
  </div>
</template>
