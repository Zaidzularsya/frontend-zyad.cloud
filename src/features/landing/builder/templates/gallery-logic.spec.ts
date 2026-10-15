import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PageTemplateSummary } from '@/features/landing/shared/types/page-template.types'
import {
  createRenderQueue,
  filterTemplates,
  readBannerDismissed,
  shouldShowTemplateBanner,
  visibleCategories,
  writeBannerDismissed,
} from './gallery-logic'

const tpl = (over: Partial<PageTemplateSummary>): PageTemplateSummary => ({
  id: 'x',
  slug: 'x',
  name: 'X',
  description: '',
  category: 'dasar',
  sort_order: 1,
  platform_only: false,
  updated_at: '',
  ...over,
})

describe('filterTemplates', () => {
  const list = [
    tpl({ id: 'a', name: 'Klinik & Layanan Kesehatan', category: 'kesehatan' }),
    tpl({ id: 'b', name: 'Restoran & Kafe', description: 'Menu andalan', category: 'kuliner' }),
  ]

  it('mengabaikan huruf besar dan spasi berlebih', () => {
    expect(filterTemplates(list, { category: 'all', query: '  KLINIK ' }).map((t) => t.id)).toEqual(
      ['a'],
    )
  })

  it('mencocokkan deskripsi', () => {
    expect(filterTemplates(list, { category: 'all', query: 'andalan' }).map((t) => t.id)).toEqual([
      'b',
    ])
  })

  it('menyaring per kategori', () => {
    expect(filterTemplates(list, { category: 'kuliner', query: '' }).map((t) => t.id)).toEqual([
      'b',
    ])
  })

  it('mengembalikan [] bila tidak ada yang cocok', () => {
    expect(filterTemplates(list, { category: 'all', query: 'zzz' })).toEqual([])
  })
})

describe('visibleCategories', () => {
  it('hanya kategori yang punya template, urut baku', () => {
    const cats = visibleCategories([tpl({ category: 'kuliner' }), tpl({ category: 'dasar' })])
    expect(cats.map((c) => c.code)).toEqual(['dasar', 'kuliner'])
  })
})

describe('shouldShowTemplateBanner', () => {
  it.each([
    [{ pageStatus: 'published', canvasEmpty: false, dismissed: false }, false],
    [{ pageStatus: 'draft', canvasEmpty: true, dismissed: false }, false],
    [{ pageStatus: 'draft', canvasEmpty: false, dismissed: true }, false],
    [{ pageStatus: 'draft', canvasEmpty: false, dismissed: false }, true],
    [{ pageStatus: null, canvasEmpty: false, dismissed: false }, true],
  ])('%j → %s', (input, expected) => {
    expect(shouldShowTemplateBanner(input)).toBe(expected)
  })
})

describe('banner dismissal storage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('read mengembalikan false bila localStorage melempar error', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readBannerDismissed('p1')).toBe(false)
  })

  it('write tidak melempar bila localStorage gagal', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => writeBannerDismissed('p1')).not.toThrow()
  })

  it('write lalu read per halaman', () => {
    localStorage.clear()
    writeBannerDismissed('p1')
    expect(readBannerDismissed('p1')).toBe(true)
    expect(readBannerDismissed('p2')).toBe(false)
    expect(localStorage.getItem('zy:tpl-banner-dismissed:p1')).toBe('1')
  })
})

describe('createRenderQueue', () => {
  it('slot ketiga baru resolve setelah satu slot dilepas', async () => {
    const q = createRenderQueue(2)
    const r1 = await q.acquire()
    await q.acquire()
    let third = false
    const p3 = q.acquire().then((release) => {
      third = true
      return release
    })
    await Promise.resolve()
    expect(third).toBe(false)
    r1()
    await p3
    expect(third).toBe(true)
  })

  it('melepas dua kali tidak menambah kapasitas', async () => {
    const q = createRenderQueue(1)
    const r1 = await q.acquire()
    r1()
    r1()
    await q.acquire()
    let second = false
    void q.acquire().then(() => {
      second = true
    })
    await Promise.resolve()
    expect(second).toBe(false)
  })
})
