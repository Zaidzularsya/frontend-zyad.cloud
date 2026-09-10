// ─── Core Enums & Unions ────────────────────────────────────────────────────

export type PageStatus = 'draft' | 'published' | 'unpublished' | 'archived'
export type PageType =
  | 'homepage'
  | 'company_profile'
  | 'product_service'
  | 'campaign'
  | 'pricing'
  | 'contact'
  | 'lead_capture'
  | 'promo_event'
  | 'portfolio_case_study'
export type PageVisibility = 'public' | 'private' | 'password_protected'

/**
 * Tipe section yang dikenal oleh renderer maupun backend.
 * Renderer menggunakan tipe ini untuk lookup ke section-registry.
 *
 * Backend (landing_page_sections.section_type check constraint) mengizinkan:
 * hero, about, features, services, product_showcase, content, gallery,
 * portfolio, testimonial, pricing, faq, cta, form, contact, newsletter,
 * partner_logos, statistics, footer — tenant dapat membuat section dari
 * daftar ini. `benefits`, `problem`, `solution`, `demo` HANYA dipakai oleh
 * public marketing page platform (bukan section type yang valid untuk
 * tenant-authored page) dan sengaja dikecualikan dari section-schemas.ts.
 */
export type LandingSectionType =
  | 'hero'
  | 'benefits'
  | 'services'
  | 'problem'
  | 'solution'
  | 'demo'
  | 'faq'
  | 'cta'
  | 'footer'
  | 'features'
  | 'content'
  | 'portfolio'
  | 'about'
  | 'contact'
  | 'pricing'
  | 'product_showcase'
  | 'gallery'
  | 'testimonial'
  | 'form'
  | 'newsletter'
  | 'partner_logos'
  | 'statistics'

// ─── Page ───────────────────────────────────────────────────────────────────

export interface LandingTheme {
  code?: string
  tokens?: Record<string, unknown>
  colors?: Record<string, unknown>
  typography?: Record<string, unknown>
  shape?: Record<string, unknown>
}

/** Which editor authors a landing page's content. */
export type LandingBuilder = 'sections' | 'grapesjs'

/** GrapesJS working copy of a page (builder === 'grapesjs'). */
export interface LandingDocument {
  landing_page_id: string
  project: Record<string, unknown>
  html: string
  css: string
  updated_at: string
}

export interface LandingPage {
  id: string
  name: string
  title: string
  slug: string
  page_type: PageType
  builder: LandingBuilder
  status: PageStatus
  visibility: PageVisibility
  locale: string
  timezone: string
  is_homepage: boolean
  is_template: boolean
  settings?: Record<string, unknown>
  seo?: Record<string, unknown>
  published_version: number
  publish_at?: string | null
  unpublish_at?: string | null
  published_at?: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
  /** Template key (blueprint) yang dipakai saat page dibuat. */
  template?: string
  /** Theme visual tokens. */
  theme?: LandingTheme | Record<string, unknown>
  /** Preferensi page/brand/tenant. */
  preferences?: Record<string, unknown>
}

// ─── Section ────────────────────────────────────────────────────────────────

export interface LandingSection {
  id: string
  key: string
  type: LandingSectionType | string
  name: string
  sort_order: number
  is_enabled: boolean
  content: Record<string, unknown>
  style: Record<string, unknown>
  created_at: string
  updated_at: string
  /** Variant untuk lookup di section-registry (e.g. 'default', 'three_js'). */
  variant?: string
  /** Alias is_enabled untuk konsistensi dengan renderer. */
  isVisible?: boolean
  /** Alias sort_order untuk konsistensi dengan renderer. */
  sortOrder?: number
}

// ─── Forms ──────────────────────────────────────────────────────────────────

export interface LandingForm {
  id: string
  name: string
  key: string
  submit_label: string
  success_message: string
  redirect_url?: string | null
  is_active: boolean
  consent?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface LandingFormField {
  id?: string
  key: string
  type: string
  label: string
  placeholder?: string
  options?: string[]
  validation?: Record<string, unknown>
  required: boolean
  sort_order: number
}

// ─── Branding ────────────────────────────────────────────────────────────────

export interface LandingBranding {
  company_name: string
  tagline: string
  logo_light_url: string
  logo_dark_url: string
  favicon_url: string
  social_image_url: string
  colors: Record<string, unknown>
  typography: Record<string, unknown>
  shape: Record<string, unknown>
  layout: Record<string, unknown>
  contact: Record<string, unknown>
  social_links: Array<Record<string, unknown>>
  created_at?: string
  updated_at?: string
}

// ─── Footer ──────────────────────────────────────────────────────────────────

/**
 * Kontrak konten yang sama dipakai seluruh variant footer (FTR-FE-010).
 * Semua field opsional (kecuali brandName/copyright) supaya komponen footer
 * tetap aman dirender walau tenant belum mengisi Brand & Theme/Navigation/
 * Settings secara lengkap — lihat "Footer Content Model" di
 * docs/footer-management-development-tasks.md.
 */
export interface FooterContent {
  brandName: string
  logoUrl?: string
  description?: string
  columns: Array<{
    title: string
    links: Array<{ label: string; href: string }>
  }>
  copyright: string
  trustBadges?: Array<{ image_url: string; label: string }>
  secondaryCta?: { label: string; url: string }
  newsletterFormId?: string
  socialLinks?: Array<Record<string, unknown>>
  contact?: Record<string, unknown>
}

// ─── Domain ──────────────────────────────────────────────────────────────────

export interface LandingDomainBinding {
  id: string
  organization_domain_id: string
  landing_page_id: string
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface LandingAvailableDomain {
  id: string
  domain?: string
  hostname?: string
  status?: string
  is_primary?: boolean
  [key: string]: unknown
}

// ─── Templates ───────────────────────────────────────────────────────────────

export interface SectionTemplate {
  id: string
  name: string
  description?: string
  section_type: string
  content: Record<string, unknown>
  style: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ─── CTA ─────────────────────────────────────────────────────────────────────

export interface CallToAction {
  id: string
  name: string
  label: string
  type: 'contact_form' | 'whatsapp' | 'external_link' | 'internal_page' | 'document_download'
  target: 'self' | 'new_tab' | 'modal' | string
  destination: string
  tracking_key: string
  created_at: string
  updated_at: string
}

// ─── Media ───────────────────────────────────────────────────────────────────

export interface LandingMedia {
  id: string
  storage_key?: string
  public_url?: string
  filename: string
  mime_type: string
  size_bytes: number
  width?: number | null
  height?: number | null
  duration_seconds?: number | null
  alt_text?: string
  processing_status?: string
  created_at: string
  updated_at?: string
}

// ─── Menu ────────────────────────────────────────────────────────────────────

export interface LandingMenu {
  id: string
  name: string
  location: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LandingMenuItem {
  id: string
  parent_id?: string | null
  label: string
  link_type: 'internal_page' | 'external_link' | 'anchor' | 'button' | string
  destination: string
  target: string
  sort_order: number
  is_enabled: boolean
  children?: LandingMenuItem[]
}

// ─── Revision ────────────────────────────────────────────────────────────────

export interface LandingRevision {
  id: string
  landing_page_id: string
  revision_number?: number
  version?: number
  change_note?: string
  snapshot: Record<string, unknown>
  created_by?: string
  created_at: string
}

// ─── Schedule ────────────────────────────────────────────────────────────────

export interface LandingSchedule {
  id: string
  landing_page_id: string
  action: 'publish' | 'unpublish'
  scheduled_at: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  error_message?: string | null
  attempts: number
  created_at: string
  updated_at: string
}

// ─── Integration ─────────────────────────────────────────────────────────────

export interface LandingIntegration {
  id: string
  name: string
  type: 'notification' | 'webhook' | string
  credentials?: Record<string, unknown>
  event_filters: unknown[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LandingDeliveryLog {
  id: string
  integration_id: string
  submission_id: string
  status: 'pending' | 'success' | 'failed' | string
  attempts: number
  error_message?: string | null
  response_payload?: string | null
  next_retry_at?: string | null
  created_at: string
  updated_at: string
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface PaginatedResponse<T> {
  success: boolean
  message: string
  data: T[]
  meta: PaginationMeta
}

export interface BaseResponse<T> {
  success: boolean
  message: string
  data: T
  meta: null
}
