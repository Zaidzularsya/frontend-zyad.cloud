import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGet = vi.fn()
const httpPost = vi.fn()
const httpPatch = vi.fn()

vi.mock('@/lib/http', () => ({
  http: {
    get: (...a: unknown[]) => httpGet(...a),
    post: (...a: unknown[]) => httpPost(...a),
    patch: (...a: unknown[]) => httpPatch(...a),
  },
}))

import { pageTemplatesApi } from './page-templates.api'
import { PAGE_TEMPLATE_CATEGORIES } from '../page-template-categories'

describe('pageTemplatesApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list() memanggil endpoint daftar dan mengembalikan array', async () => {
    httpGet.mockResolvedValue({ data: { success: true, data: [{ id: 't1' }] } })
    expect(await pageTemplatesApi.list()).toEqual([{ id: 't1' }])
    expect(httpGet).toHaveBeenCalledWith('/admin/landing-templates')
  })

  it('list() mengembalikan [] bila data null', async () => {
    httpGet.mockResolvedValue({ data: { success: true, data: null } })
    expect(await pageTemplatesApi.list()).toEqual([])
  })

  it('get() memanggil endpoint detail', async () => {
    httpGet.mockResolvedValue({
      data: { success: true, data: { id: 't1', html: '<p/>', css: '' } },
    })
    const res = await pageTemplatesApi.get('t1')
    expect(httpGet).toHaveBeenCalledWith('/admin/landing-templates/t1')
    expect(res.html).toBe('<p/>')
  })
})

describe('pageTemplatesApi — kelola', () => {
  beforeEach(() => vi.clearAllMocks())

  it('listAll() memanggil /all', async () => {
    httpGet.mockResolvedValue({ data: { success: true, data: [{ id: 'a', status: 'draft' }] } })
    expect(await pageTemplatesApi.listAll()).toEqual([{ id: 'a', status: 'draft' }])
    expect(httpGet).toHaveBeenCalledWith('/admin/landing-templates/all')
  })

  it('create() mem-POST payload', async () => {
    httpPost.mockResolvedValue({ data: { success: true, data: { id: 'n' } } })
    const payload = {
      page_id: 'p1',
      name: 'N',
      slug: 'n',
      category: 'dasar' as const,
      description: '',
      sort_order: 1,
    }
    expect(await pageTemplatesApi.create(payload)).toEqual({ id: 'n' })
    expect(httpPost).toHaveBeenCalledWith('/admin/landing-templates', payload)
  })

  it('refreshFromPage() dan copyToPage() memanggil path yang benar', async () => {
    httpPost.mockResolvedValue({ data: { success: true, data: { page_id: 'p', slug: 's' } } })
    await pageTemplatesApi.refreshFromPage('t1')
    expect(httpPost).toHaveBeenCalledWith('/admin/landing-templates/t1/refresh-from-page')
    expect(await pageTemplatesApi.copyToPage('t1')).toEqual({ page_id: 'p', slug: 's' })
    expect(httpPost).toHaveBeenLastCalledWith('/admin/landing-templates/t1/copy-to-page')
  })

  it('update() mem-PATCH', async () => {
    httpPatch.mockResolvedValue({ data: { success: true, data: { id: 't1' } } })
    await pageTemplatesApi.update('t1', { status: 'archived' })
    expect(httpPatch).toHaveBeenCalledWith('/admin/landing-templates/t1', { status: 'archived' })
  })
})

describe('PAGE_TEMPLATE_CATEGORIES', () => {
  it('berisi 12 kategori dengan urutan dan label baku', () => {
    expect(PAGE_TEMPLATE_CATEGORIES.map((c) => [c.code, c.label])).toEqual([
      ['dasar', 'Dasar'],
      ['bisnis-jasa', 'Bisnis & Jasa'],
      ['personal', 'Personal & Portofolio'],
      ['acara', 'Acara'],
      ['kesehatan', 'Kesehatan'],
      ['pendidikan', 'Pendidikan'],
      ['komunitas', 'Komunitas & Asosiasi'],
      ['kuliner', 'Kuliner'],
      ['properti', 'Properti'],
      ['ritel-umkm', 'Ritel & UMKM'],
      ['teknologi-isp', 'Teknologi & ISP'],
      ['platform', 'Platform'],
    ])
  })
})
