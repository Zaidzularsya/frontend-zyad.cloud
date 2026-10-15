import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGet = vi.fn()

vi.mock('@/lib/http', () => ({
  http: { get: (...a: unknown[]) => httpGet(...a) },
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
