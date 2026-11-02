import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mikrotikApi, previewExportUrl } from '@/features/mikrotik/api/mikrotik.api'

const mocked = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/lib/http', () => ({ http: mocked }))

beforeEach(() => vi.resetAllMocks())

describe('previewExportUrl', () => {
  it('menuju endpoint ekspor dan hanya membawa status dan q', () => {
    const url = previewExportUrl({ status: 'will_isolate', q: 'budi santoso' })
    expect(url).toContain('/app/mikrotik/control/preview/export?')
    const qs = new URLSearchParams(url.split('?')[1])
    expect(qs.get('status')).toBe('will_isolate')
    expect(qs.get('q')).toBe('budi santoso')
  })

  it('tanpa filter tidak memakai query string', () => {
    expect(previewExportUrl()).toMatch(/\/app\/mikrotik\/control\/preview\/export$/)
  })
})

describe('mikrotikApi control', () => {
  it('get membuka envelope data', async () => {
    mocked.get.mockResolvedValue({ data: { data: { mode: 'simulation' } } })
    await expect(mikrotikApi.control.get()).resolves.toEqual({ mode: 'simulation' })
    expect(mocked.get).toHaveBeenCalledWith('/app/mikrotik/control')
  })

  it('setMode mengirim mode dan pengecualian', async () => {
    mocked.put.mockResolvedValue({ data: { data: {} } })
    const payload = {
      mode: 'active' as const,
      exemptions: { account_ids: ['a'], reason: 'VIP', until: '2026-12-01' },
    }
    await mikrotikApi.control.setMode(payload)
    expect(mocked.put).toHaveBeenCalledWith('/app/mikrotik/control/mode', payload)
  })

  it('setGraceDays mengirim grace_days', async () => {
    mocked.put.mockResolvedValue({ data: { data: {} } })
    await mikrotikApi.control.setGraceDays(7)
    expect(mocked.put).toHaveBeenCalledWith('/app/mikrotik/control/grace-days', { grace_days: 7 })
  })

  it('preview mengembalikan data dan meta', async () => {
    mocked.get.mockResolvedValue({ data: { data: [{ account_id: 'a' }], meta: { total: 1 } } })
    const r = await mikrotikApi.control.preview({ status: 'exempt', page: 2 })
    expect(r).toEqual({ data: [{ account_id: 'a' }], meta: { total: 1 } })
    expect(mocked.get).toHaveBeenCalledWith('/app/mikrotik/control/preview', {
      params: { status: 'exempt', page: 2 },
    })
  })

  it('pilot: add/remove/test memakai rute dan verb yang benar', async () => {
    mocked.put.mockResolvedValue({})
    mocked.delete.mockResolvedValue({})
    mocked.post.mockResolvedValue({ data: { data: { test_until: 't' } } })
    await mikrotikApi.pilot.add('x')
    await mikrotikApi.pilot.remove('x')
    await expect(mikrotikApi.pilot.startTest('x')).resolves.toEqual({ test_until: 't' })
    await mikrotikApi.pilot.stopTest('x')
    expect(mocked.put).toHaveBeenCalledWith('/app/mikrotik/control/pilot/x')
    expect(mocked.delete).toHaveBeenNthCalledWith(1, '/app/mikrotik/control/pilot/x')
    expect(mocked.post).toHaveBeenCalledWith('/app/mikrotik/control/pilot/x/test')
    expect(mocked.delete).toHaveBeenNthCalledWith(2, '/app/mikrotik/control/pilot/x/test')
  })

  it('restoreAll dan activity', async () => {
    mocked.post.mockResolvedValue({ data: { data: { enqueued: 2 } } })
    await expect(mikrotikApi.control.restoreAll()).resolves.toEqual({ enqueued: 2 })
    mocked.get.mockResolvedValue({ data: { data: [], meta: { limit: 50, offset: 0, total: 0 } } })
    await expect(mikrotikApi.control.activity({ limit: 50 })).resolves.toEqual({
      data: [],
      meta: { limit: 50, offset: 0, total: 0 },
    })
  })
})
