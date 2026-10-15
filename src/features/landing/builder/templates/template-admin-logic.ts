import type {
  PageTemplateAdminSummary,
  PageTemplateStatus,
} from '@/features/landing/shared/types/page-template.types'

const SLUG_PATTERN = /^[a-z0-9-]+$/

export function slugifyTemplateName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')
}

export type TemplateMetaErrors = Partial<
  Record<'name' | 'slug' | 'description' | 'sort_order', string>
>

export function validateTemplateMeta(m: {
  name: string
  slug: string
  description: string
  sort_order: number
}): TemplateMetaErrors {
  const errors: TemplateMetaErrors = {}
  const name = m.name.trim()
  if (name.length < 1 || name.length > 120) errors.name = 'Nama wajib diisi (maks. 120 karakter).'
  if (m.slug.length < 1 || m.slug.length > 80 || !SLUG_PATTERN.test(m.slug)) {
    errors.slug = 'Slug hanya huruf kecil, angka, dan tanda hubung (maks. 80).'
  }
  if (m.description.length > 240) errors.description = 'Deskripsi maks. 240 karakter.'
  if (!Number.isInteger(m.sort_order) || m.sort_order < 0 || m.sort_order > 9999) {
    errors.sort_order = 'Urutan 0–9999.'
  }
  return errors
}

/** Template yang memakai slot Pricing Katalog otomatis terkunci khusus platform (K13). */
export function isPlatformLocked(html: string): boolean {
  return html.includes('data-zyad-slot="catalog-pricing"')
}

export function sourceTemplateForPage(
  list: PageTemplateAdminSummary[],
  pageId: string,
): PageTemplateAdminSummary | null {
  return list.find((t) => t.source_page_id === pageId) ?? null
}

export type TemplateRowAction =
  | 'preview'
  | 'publish'
  | 'unpublish'
  | 'archive'
  | 'restore'
  | 'edit'
  | 'open-source'
  | 'copy-to-page'

export function rowActions(t: PageTemplateAdminSummary): TemplateRowAction[] {
  const byStatus: Record<PageTemplateStatus, TemplateRowAction[]> = {
    draft: ['publish', 'archive'],
    published: ['unpublish', 'archive'],
    archived: ['restore'],
  }
  return [
    'preview',
    'edit',
    ...byStatus[t.status],
    t.source_page_id ? 'open-source' : 'copy-to-page',
  ]
}
