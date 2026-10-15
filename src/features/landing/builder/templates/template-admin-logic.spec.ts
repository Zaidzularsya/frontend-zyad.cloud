import { describe, expect, it } from 'vitest'
import type { PageTemplateAdminSummary } from '@/features/landing/shared/types/page-template.types'
import {
  isPlatformLocked,
  rowActions,
  slugifyTemplateName,
  sourceTemplateForPage,
  validateTemplateMeta,
} from './template-admin-logic'

const row = (over: Partial<PageTemplateAdminSummary>): PageTemplateAdminSummary => ({
  id: 'x',
  slug: 'x',
  name: 'X',
  description: '',
  category: 'dasar',
  sort_order: 1,
  platform_only: false,
  updated_at: '',
  status: 'draft',
  source: 'admin',
  seed_modified: false,
  source_page_id: null,
  ...over,
})

describe('slugifyTemplateName', () => {
  it('menyederhanakan nama menjadi slug', () => {
    expect(slugifyTemplateName('Klinik & Layanan  Kesehatan!')).toBe('klinik-layanan-kesehatan')
    expect(slugifyTemplateName('  --A--  ')).toBe('a')
  })

  it('memotong hasil sampai 80 karakter tanpa tanda hubung di ujung', () => {
    const slug = slugifyTemplateName('kata '.repeat(40))
    expect(slug.length).toBeLessThanOrEqual(80)
    expect(slug.endsWith('-')).toBe(false)
  })
})

describe('validateTemplateMeta', () => {
  const ok = { name: 'Klinik', slug: 'klinik', description: 'd', sort_order: 10 }

  it('input valid → {}', () => {
    expect(validateTemplateMeta(ok)).toEqual({})
  })

  it.each([
    [{ name: '  ' }, 'name', 'Nama wajib diisi (maks. 120 karakter).'],
    [{ name: 'n'.repeat(121) }, 'name', 'Nama wajib diisi (maks. 120 karakter).'],
    [{ slug: 'Klinik' }, 'slug', 'Slug hanya huruf kecil, angka, dan tanda hubung (maks. 80).'],
    [{ slug: '' }, 'slug', 'Slug hanya huruf kecil, angka, dan tanda hubung (maks. 80).'],
    [
      { slug: 'a'.repeat(81) },
      'slug',
      'Slug hanya huruf kecil, angka, dan tanda hubung (maks. 80).',
    ],
    [{ description: 'd'.repeat(241) }, 'description', 'Deskripsi maks. 240 karakter.'],
    [{ sort_order: -1 }, 'sort_order', 'Urutan 0–9999.'],
    [{ sort_order: 10000 }, 'sort_order', 'Urutan 0–9999.'],
    [{ sort_order: 1.5 }, 'sort_order', 'Urutan 0–9999.'],
  ])('pelanggaran %j', (patch, key, message) => {
    expect(validateTemplateMeta({ ...ok, ...patch })).toEqual({ [key]: message })
  })
})

describe('isPlatformLocked', () => {
  it('true bila html memakai slot catalog-pricing', () => {
    expect(isPlatformLocked('<div data-zyad-slot="catalog-pricing"></div>')).toBe(true)
    expect(isPlatformLocked('<div data-zyad-slot="lead-form"></div>')).toBe(false)
  })
})

describe('sourceTemplateForPage', () => {
  it('menemukan template dengan source_page_id yang cocok', () => {
    const list = [row({ id: 'a' }), row({ id: 'b', source_page_id: 'p1' })]
    expect(sourceTemplateForPage(list, 'p1')?.id).toBe('b')
    expect(sourceTemplateForPage(list, 'p2')).toBeNull()
  })
})

describe('rowActions', () => {
  it('draft dengan halaman sumber', () => {
    expect(new Set(rowActions(row({ status: 'draft', source_page_id: 'p1' })))).toEqual(
      new Set(['preview', 'edit', 'publish', 'archive', 'open-source']),
    )
  })

  it('published → unpublish dan archive', () => {
    const actions = rowActions(row({ status: 'published' }))
    expect(actions).toContain('unpublish')
    expect(actions).toContain('archive')
    expect(actions).not.toContain('publish')
  })

  it('archived tanpa sumber → restore + copy-to-page, tanpa publish', () => {
    const actions = rowActions(row({ status: 'archived', source_page_id: null }))
    expect(actions).toContain('restore')
    expect(actions).toContain('copy-to-page')
    expect(actions).not.toContain('publish')
    expect(actions).not.toContain('open-source')
  })
})
