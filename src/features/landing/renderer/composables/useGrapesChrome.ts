import { useFooterContent } from './useFooterContent'
import type {
  GrapesChrome,
  GrapesChromeLink,
  GrapesChromePricingPlan,
} from '../components/GrapesPageFrame.vue'

/**
 * Builds the live tenant chrome (header nav + footer) for GrapesJS pages from a
 * raw `/public/landing/resolve` payload. Fed into the `data-zyad-slot` sentinels
 * by GrapesPageFrame so editing the tenant menu / branding updates every
 * GrapesJS page without re-publishing. Footer reuses `useFooterContent`.
 */

type RawRecord = Record<string, unknown>

export function buildGrapesChrome(result: RawRecord, fallbackTitle: string): GrapesChrome {
  const footer = useFooterContent(result, fallbackTitle)
  return {
    nav: headerLinks(result),
    brand: { name: footer.brandName, logoUrl: footer.logoUrl },
    footer: {
      brandName: footer.brandName,
      logoUrl: footer.logoUrl,
      copyright: footer.copyright,
      columns: footer.columns,
    },
    pricingPlans: pricingPlans(result),
  }
}

function pricingPlans(result: RawRecord): GrapesChromePricingPlan[] {
  return pickArray(result, 'PricingPlans', 'pricing_plans').map((plan) => ({
    id: pickString(plan, 'id', 'ID'),
    name: pickString(plan, 'name', 'Name'),
    priceLabel: pickString(plan, 'price_label', 'PriceLabel'),
    intervalLabel: pickString(plan, 'interval_label', 'IntervalLabel'),
    description: pickString(plan, 'description', 'Description'),
    features: pickStringArray(plan, 'features', 'Features'),
    ctaLabel: pickString(plan, 'cta_label', 'CTALabel'),
    ctaUrl: pickString(plan, 'cta_url', 'CTAURL'),
    isFeatured: pickBoolean(plan, ['is_featured', 'IsFeatured'], false),
  }))
}

function headerLinks(result: RawRecord): GrapesChromeLink[] {
  const menus = pickArray(result, 'Menus', 'menus')
  for (const menu of menus) {
    const location = pickString(menu, 'location', 'Location')
    const isActive = pickBoolean(menu, ['is_active', 'IsActive'], true)
    if (location !== 'header' || !isActive) continue

    return pickArray(menu, 'items', 'Items')
      .filter((item) => pickBoolean(item, ['is_enabled', 'IsEnabled'], true))
      .sort(
        (a, b) =>
          pickNumber(a, 'sort_order', 'SortOrder') - pickNumber(b, 'sort_order', 'SortOrder'),
      )
      .map((item) => ({
        label: pickString(item, 'label', 'Label'),
        href: hrefFor(
          pickString(item, 'link_type', 'LinkType'),
          pickString(item, 'destination', 'Destination'),
        ),
        target: pickString(item, 'target', 'Target') || 'self',
      }))
      .filter((link) => link.label)
  }
  return []
}

function hrefFor(linkType: string, destination: string): string {
  const dest = destination.trim()
  if (linkType === 'anchor') return dest.startsWith('#') ? dest : `#${dest}`
  if (linkType === 'internal_page' || linkType === 'button') {
    if (!dest || dest === 'public-marketing') return '/'
    return dest.startsWith('/') ? dest : `/${dest}`
  }
  return dest || '#'
}

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

function pickStringArray(record: RawRecord, ...keys: string[]): string[] {
  for (const key of keys) {
    const val = record?.[key]
    if (Array.isArray(val)) return val.filter((v): v is string => typeof v === 'string')
  }
  return []
}

function pickArray(record: RawRecord, ...keys: string[]): RawRecord[] {
  for (const key of keys) {
    const val = record?.[key]
    if (Array.isArray(val)) return val as RawRecord[]
  }
  return []
}
