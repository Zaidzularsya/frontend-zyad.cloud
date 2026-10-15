import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
vi.mock('@/lib/http', () => ({ http: { get: (...a: unknown[]) => get(...a) } }))

import { publicCatalogApi } from './public-catalog.api'

describe('publicCatalogApi.listListings', () => {
  beforeEach(() => get.mockReset())

  it('membaca data.categories dari envelope backend', async () => {
    get.mockResolvedValue({
      data: { data: { categories: [{ id: 'c1', name: 'Paket', position: 1, listings: [] }] } },
    })
    const result = await publicCatalogApi.listListings()
    expect(get).toHaveBeenCalledWith('/public/catalog/listings')
    expect(result.map((c) => c.id)).toEqual(['c1'])
  })

  it('data kosong → array kosong', async () => {
    get.mockResolvedValue({ data: { data: { categories: [] } } })
    expect(await publicCatalogApi.listListings()).toEqual([])
    get.mockResolvedValue({ data: {} })
    expect(await publicCatalogApi.listListings()).toEqual([])
  })
})
