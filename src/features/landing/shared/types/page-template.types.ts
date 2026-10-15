export type PageTemplateCategory =
  | 'dasar'
  | 'bisnis-jasa'
  | 'personal'
  | 'acara'
  | 'kesehatan'
  | 'pendidikan'
  | 'komunitas'
  | 'kuliner'
  | 'properti'
  | 'ritel-umkm'
  | 'teknologi-isp'
  | 'platform'

export interface PageTemplateSummary {
  id: string
  slug: string
  name: string
  description: string
  category: PageTemplateCategory
  sort_order: number
  platform_only: boolean
  updated_at: string
}

export interface PageTemplateDetail extends PageTemplateSummary {
  html: string
  css: string
}

export type PageTemplateStatus = 'draft' | 'published' | 'archived'

/** Item dari GET /admin/landing-templates/all (hanya org platform). */
export interface PageTemplateAdminSummary extends PageTemplateSummary {
  status: PageTemplateStatus
  source: 'seed' | 'admin'
  seed_modified: boolean
  source_page_id: string | null
}
