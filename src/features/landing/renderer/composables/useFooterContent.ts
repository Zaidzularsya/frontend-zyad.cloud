import { normalizeBranding } from '../../shared/api/landing.api'
import type { FooterContent } from '../../shared/types/landing.types'

/**
 * Menyusun `FooterContent` (FTR-FE-010) dari payload mentah
 * `/public/landing/resolve` — brand dari Branding, kolom link dari menu
 * `location=footer`, sisanya dari `Page.Settings` + `CTAs`.
 *
 * Diekstrak dari `DynamicLandingPage.vue` (FTR-FE-011) supaya logic ini
 * reusable untuk preview/testing tanpa perlu mount seluruh halaman publik.
 */

type RawRecord = Record<string, unknown>

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

export function useFooterContent(result: RawRecord, fallbackTitle: string): FooterContent {
  const rawPage = pickObject(result, 'Page', 'page')
  const rawBranding = pickObject(result, 'Branding', 'branding')
  const branding = normalizeBranding(rawBranding)

  const rawMenus = pickArray(result, 'Menus', 'menus')
  const menus = normalizeMenus(rawMenus)

  const rawSettings = pickObject(rawPage, 'settings', 'Settings')
  const copyrightText = pickString(rawSettings, 'footer_copyright_text', 'FooterCopyrightText')

  const rawTrustBadges = pickArray(rawSettings, 'trust_badges', 'TrustBadges')
  const trustBadges = rawTrustBadges
    .map((badge) => ({
      image_url: pickString(badge, 'image_url', 'ImageURL'),
      label: pickString(badge, 'label', 'Label'),
    }))
    .filter((badge) => badge.image_url || badge.label)

  const secondaryCtaTrackingKey = pickString(
    rawSettings,
    'secondary_cta_tracking_key',
    'SecondaryCTATrackingKey',
  )
  const rawCTAs = pickArray(result, 'CTAs', 'ctas')
  const secondaryCta = secondaryCtaTrackingKey
    ? resolveSecondaryCta(rawCTAs, secondaryCtaTrackingKey)
    : undefined

  const newsletterFormId = pickString(rawSettings, 'newsletter_form_id', 'NewsletterFormID')

  return {
    brandName: branding.company_name || fallbackTitle,
    logoUrl: branding.logo_light_url || undefined,
    description: branding.tagline,
    columns: getFooterColumns(menus),
    copyright: copyrightText || `© ${new Date().getFullYear()} ${branding.company_name}`.trim(),
    trustBadges: trustBadges.length > 0 ? trustBadges : undefined,
    secondaryCta,
    newsletterFormId: newsletterFormId || undefined,
    socialLinks: branding.social_links.length > 0 ? branding.social_links : undefined,
    contact: Object.keys(branding.contact ?? {}).length > 0 ? branding.contact : undefined,
  }
}

function resolveSecondaryCta(rawCTAs: RawRecord[], trackingKey: string) {
  const match = rawCTAs.find(
    (cta) => pickString(cta, 'tracking_key', 'TrackingKey') === trackingKey,
  )
  if (!match) return undefined
  const label = pickString(match, 'label', 'Label')
  const destination = pickString(match, 'destination', 'Destination')
  if (!label || !destination) return undefined
  return { label, url: destination }
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

function getFooterColumns(menuList: RawMenu[]) {
  return menuList
    .filter((menu) => menu.location === 'footer' && menu.is_active && menu.items.length > 0)
    .map((menu) => ({
      title: menu.name,
      links: menu.items.map((item) => ({
        label: item.label,
        href: normalizeNavigationDestination(item),
      })),
    }))
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
