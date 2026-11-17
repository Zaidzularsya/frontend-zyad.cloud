import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() }))
vi.mock('@/lib/http', () => ({ http }))

import { receivableApi } from './receivable.api'

describe('receivableApi.arrears', () => {
  beforeEach(() => {
    for (const fn of Object.values(http)) fn.mockReset()
  })

  it('fetches the periods of a contract', async () => {
    http.get.mockResolvedValue({ data: { data: { periods: [], has_trigger_product: false } } })
    await expect(receivableApi.arrears.periods('ctr-1')).resolves.toEqual({
      periods: [],
      has_trigger_product: false,
    })
    expect(http.get).toHaveBeenCalledWith('/app/receivable/contracts/ctr-1/arrears/periods')
  })

  it('records with the Idempotency-Key header', async () => {
    http.post.mockResolvedValue({
      data: { data: { recording: { id: 'r1' }, invoices: [], notify_status: 'sent' } },
    })
    const payload = { account_id: 'a', contract_id: 'c', reason: 'x', rows: [] }
    await receivableApi.arrears.record(payload, 'key-1')
    expect(http.post).toHaveBeenCalledWith('/app/receivable/invoices/arrears', payload, {
      headers: { 'Idempotency-Key': 'key-1' },
    })
  })

  it('resends and sets the isolation flag', async () => {
    http.post.mockResolvedValue({ data: { data: { id: 'r1' } } })
    http.put.mockResolvedValue({ data: { data: { id: 'inv-1', isolir_flag: true } } })
    await receivableApi.arrears.resend('r1')
    expect(http.post).toHaveBeenCalledWith('/app/receivable/invoices/arrears/r1/resend')
    await receivableApi.invoices.setIsolirFlag('inv-1', true)
    expect(http.put).toHaveBeenCalledWith('/app/receivable/invoices/inv-1/isolir-flag', {
      value: true,
    })
  })
})
