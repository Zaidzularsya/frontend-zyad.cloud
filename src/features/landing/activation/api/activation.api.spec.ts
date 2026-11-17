import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
const post = vi.fn()
vi.mock('@/lib/http', () => ({
  http: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) },
}))

import { activationApi } from './activation.api'

beforeEach(() => {
  get.mockReset()
  post.mockReset()
})

describe('activationApi.list', () => {
  it('memanggil GET /app/landing/activations dengan filter dan membaca data', async () => {
    const data = { items: [], meta: { total: 0, page: 1, per_page: 20, total_pages: 0 } }
    get.mockResolvedValue({ data: { data } })
    const result = await activationApi.list({ status: 'open', page: 2, per_page: 20 })
    expect(get).toHaveBeenCalledWith('/app/landing/activations', {
      params: { status: 'open', page: 2, per_page: 20 },
    })
    expect(result).toEqual(data)
  })

  it('tidak mengirim status kosong', async () => {
    get.mockResolvedValue({ data: { data: { items: [], meta: {} } } })
    await activationApi.list({ page: 1, per_page: 20 })
    expect(get.mock.calls[0]?.[1]).toEqual({ params: { page: 1, per_page: 20 } })
  })
})

describe('activationApi.renew', () => {
  it('POST /app/landing/activations/:id/renew dan mengembalikan link baru', async () => {
    const data = {
      activation: { id: 'a1', invoice_due_at: '2026-10-27T05:00:00Z' },
      preview_url: 'https://r.test/preview/NEW',
      payment_url: 'https://zyad.cloud/i/PAY',
    }
    post.mockResolvedValue({ data: { data } })
    const result = await activationApi.renew('a1', { invoice_due_days: 2 })
    expect(post).toHaveBeenCalledWith('/app/landing/activations/a1/renew', {
      invoice_due_days: 2,
    })
    expect(result).toEqual(data)
  })
})
