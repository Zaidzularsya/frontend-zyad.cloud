import { safeHref } from '../grapes/chrome'

// Konfigurasi tampilan slot "Pricing Katalog" yang disimpan di atribut data-zyad-config (JSON).
// Harga tidak pernah disimpan di sini. Atribut bisa rusak/diubah manual, jadi setiap field
// divalidasi sendiri dan jatuh ke default bila tidak valid; parse tidak pernah melempar error.

export interface CatalogPricingConfig {
  title: string
  subtitle: string
  categoryIds: string[]
  defaultFrequency: 'monthly' | 'yearly'
  featuredCode: string | null
  showYearlySavings: boolean
  enterpriseCard: { enabled: boolean; title: string; points: string[] }
  contactHref: string
}

const TITLE_MAX = 120
const SUBTITLE_MAX = 240
const POINTS_MAX = 6
const POINT_MAX = 120
const DEFAULT_CONTACT_HREF = '#konsultasi'

export const DEFAULT_CATALOG_PRICING_CONFIG: CatalogPricingConfig = {
  title: 'Pilih paket sesuai tahap bisnis Anda',
  subtitle: 'Mulai gratis, bayar saat Anda siap berkembang.',
  categoryIds: [],
  defaultFrequency: 'monthly',
  featuredCode: null,
  showYearlySavings: true,
  enterpriseCard: {
    enabled: true,
    title: 'Enterprise / Business',
    points: [
      'Workflow disesuaikan proses bisnis Anda',
      'Onboarding & migrasi data didampingi',
      'Multi-workspace & hak akses lanjutan',
      'Support prioritas',
    ],
  },
  contactHref: DEFAULT_CONTACT_HREF,
}

type Obj = Record<string, unknown>

function isObject(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function text(v: unknown, max: number, fallback: string): string {
  return typeof v === 'string' && v.trim() !== '' && v.length <= max ? v : fallback
}

function stringList(v: unknown, maxItems: number, maxLen: number, fallback: string[]): string[] {
  if (!Array.isArray(v) || v.length > maxItems) return [...fallback]
  if (!v.every((p) => typeof p === 'string' && p.length <= maxLen)) return [...fallback]
  return [...(v as string[])]
}

function parseEnterpriseCard(raw: unknown): CatalogPricingConfig['enterpriseCard'] {
  const d = DEFAULT_CATALOG_PRICING_CONFIG.enterpriseCard
  if (!isObject(raw)) return { ...d, points: [...d.points] }
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : d.enabled,
    title: text(raw.title, TITLE_MAX, d.title),
    points: stringList(raw.points, POINTS_MAX, POINT_MAX, d.points),
  }
}

function parseContactHref(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_CONTACT_HREF
  const href = safeHref(raw)
  return href === '#' ? DEFAULT_CONTACT_HREF : href
}

export function parseCatalogPricingConfig(raw: string | null | undefined): CatalogPricingConfig {
  const d = DEFAULT_CATALOG_PRICING_CONFIG
  let parsed: unknown
  try {
    parsed = raw ? JSON.parse(raw) : null
  } catch {
    parsed = null
  }
  const o: Obj = isObject(parsed) ? parsed : {}
  return {
    title: text(o.title, TITLE_MAX, d.title),
    subtitle: text(o.subtitle, SUBTITLE_MAX, d.subtitle),
    categoryIds:
      Array.isArray(o.categoryIds) && o.categoryIds.every((id) => typeof id === 'string')
        ? [...(o.categoryIds as string[])]
        : [],
    defaultFrequency:
      o.defaultFrequency === 'monthly' || o.defaultFrequency === 'yearly'
        ? o.defaultFrequency
        : d.defaultFrequency,
    featuredCode: typeof o.featuredCode === 'string' ? o.featuredCode : null,
    showYearlySavings:
      typeof o.showYearlySavings === 'boolean' ? o.showYearlySavings : d.showYearlySavings,
    enterpriseCard: parseEnterpriseCard(o.enterpriseCard),
    contactHref: parseContactHref(o.contactHref),
  }
}

export function serializeCatalogPricingConfig(cfg: CatalogPricingConfig): string {
  return JSON.stringify(cfg)
}
