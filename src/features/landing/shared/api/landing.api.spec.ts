import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGet = vi.fn()
const httpPut = vi.fn()
const httpPost = vi.fn()

vi.mock('@/lib/http', () => ({
  http: {
    get: (...a: unknown[]) => httpGet(...a),
    put: (...a: unknown[]) => httpPut(...a),
    post: (...a: unknown[]) => httpPost(...a),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import { landingApi } from './landing.api'

describe('landingApi — GrapesJS document', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getDocument() calls the document endpoint and normalises the payload', async () => {
    httpGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          landing_page_id: 'p1',
          project: { pages: [{ name: 'Home' }] },
          html: '<body><h1>Hi</h1></body>',
          css: 'h1{color:red}',
          updated_at: '2026-09-10T08:00:00Z',
        },
      },
    })

    const res = await landingApi.getDocument('p1')

    expect(httpGet).toHaveBeenCalledWith('/admin/landing-pages/p1/document', { params: undefined })
    expect(res.data).toEqual({
      landing_page_id: 'p1',
      project: { pages: [{ name: 'Home' }] },
      html: '<body><h1>Hi</h1></body>',
      css: 'h1{color:red}',
      updated_at: '2026-09-10T08:00:00Z',
    })
  })

  it('getDocument() falls back to safe defaults for a blank document row', async () => {
    httpGet.mockResolvedValue({ data: { success: true, data: { landing_page_id: 'p1' } } })

    const res = await landingApi.getDocument('p1')

    expect(res.data.project).toEqual({})
    expect(res.data.html).toBe('')
    expect(res.data.css).toBe('')
  })

  it('saveDocument() PUTs the project/html/css body', async () => {
    httpPut.mockResolvedValue({
      data: { success: true, data: { landing_page_id: 'p1', updated_at: '2026-09-10T09:00:00Z' } },
    })
    const payload = { project: { pages: [] }, html: '<body>x</body>', css: 'x{}' }

    const res = await landingApi.saveDocument('p1', payload)

    expect(httpPut).toHaveBeenCalledWith('/admin/landing-pages/p1/document', payload)
    expect(res.data.updated_at).toBe('2026-09-10T09:00:00Z')
  })
})
