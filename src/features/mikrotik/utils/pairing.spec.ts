import { describe, expect, it, vi } from 'vitest'

import { secret } from '@/features/mikrotik/testing/fixtures'
import type { PairBulkItem } from '@/features/mikrotik/types'
import {
  buildListParams,
  chunkItems,
  pairFailureReason,
  pairInChunks,
  progressText,
  shouldAutoAnalyze,
  visibleItems,
} from '@/features/mikrotik/utils/pairing'

const items = (n: number): PairBulkItem[] =>
  Array.from({ length: n }, (_, i) => ({ secret_id: `s${i}`, account_id: 'a' }))
const okSend = (chunk: PairBulkItem[]) =>
  Promise.resolve({
    results: chunk.map((c) => ({ secret_id: c.secret_id, ok: true, code: '', message: '' })),
  })

describe('chunkItems', () => {
  it('splits 250 into 200 + 50', () => {
    expect(chunkItems(items(250)).map((c) => c.length)).toEqual([200, 50])
  })
})

describe('pairInChunks', () => {
  it('sends 250 items in 2 sequential calls and reports progress', async () => {
    const send = vi.fn(okSend)
    const progress = vi.fn()
    const res = await pairInChunks(items(250), send, progress)
    expect(send).toHaveBeenCalledTimes(2)
    expect(res).toHaveLength(250)
    expect(progress.mock.calls).toEqual([
      [200, 250],
      [250, 250],
    ])
  })

  it('keeps chunk 1 results and fails every row of a thrown chunk 2', async () => {
    const send = vi.fn(okSend).mockImplementationOnce(okSend).mockRejectedValueOnce(new Error('x'))
    const res = await pairInChunks(items(250), send, undefined, () => 'jaringan putus')
    expect(res.filter((r) => r.ok)).toHaveLength(200)
    const failed = res.filter((r) => !r.ok)
    expect(failed).toHaveLength(50)
    expect(failed[0]).toMatchObject({ code: 'MIKROTIK_INTERNAL', message: 'jaringan putus' })
  })
})

describe('shouldAutoAnalyze', () => {
  const base = {
    routerId: 'r1',
    alreadyAnalyzed: new Set<string>(),
    unpairedTotal: 5,
    suggestedTotal: 0,
    needsDecisionTotal: 0,
    isPending: false,
    canAnalyze: true,
  }
  it('is true for a fresh router with unpaired secrets and no suggestions', () => {
    expect(shouldAutoAnalyze(base)).toBe(true)
  })
  it('is false after the first run for the same router, when pending, or without permission', () => {
    expect(shouldAutoAnalyze({ ...base, alreadyAnalyzed: new Set(['r1']) })).toBe(false)
    expect(shouldAutoAnalyze({ ...base, isPending: true })).toBe(false)
    expect(shouldAutoAnalyze({ ...base, canAnalyze: false })).toBe(false)
    expect(shouldAutoAnalyze({ ...base, suggestedTotal: 1 })).toBe(false)
    expect(shouldAutoAnalyze({ ...base, unpairedTotal: 0 })).toBe(false)
  })
})

describe('visibleItems', () => {
  it('only sends selected rows that are loaded in the current view', () => {
    const selected = new Map([
      ['a', 'acc1'],
      ['hidden', 'acc2'],
    ])
    expect(visibleItems(selected, [secret({ id: 'a' }), secret({ id: 'b' })])).toEqual([
      { secret_id: 'a', account_id: 'acc1' },
    ])
  })
})

describe('buildListParams', () => {
  const base = { routerId: 'r1', search: '', page: 2, perPage: 20 }
  it('uses the server filter for the needs-profile tab with normal pagination', () => {
    expect(buildListParams({ ...base, tab: 'needs_profile' })).toEqual({
      router_id: 'r1',
      q: undefined,
      paired: false,
      page: 2,
      per_page: 20,
      needs_original_profile: true,
    })
  })
  it('maps other tabs', () => {
    expect(buildListParams({ ...base, tab: 'paired' }).paired).toBe(true)
    expect(buildListParams({ ...base, tab: 'suggested' }).suggestion).toBe('suggested')
    expect(buildListParams({ ...base, tab: 'all' }).needs_original_profile).toBeUndefined()
  })
})

describe('progressText', () => {
  it('advances per chunk', () => {
    expect(progressText(0, 250)).toBe('Memasangkan 250 data…')
    expect(progressText(200, 250)).toBe('Memasangkan 200 dari 250 data…')
    expect(progressText(250, 250)).toBe('Memasangkan 250 data…')
  })
})

describe('pairFailureReason', () => {
  it('maps backend codes to Indonesian, ignoring the English message', () => {
    expect(pairFailureReason('MIKROTIK_ACCOUNT_NOT_FOUND', 'customer account not found')).toBe(
      'Pelanggan tidak ditemukan atau sudah dihapus.',
    )
    expect(pairFailureReason('MIKROTIK_ROUTER_NOT_FOUND', 'router not found')).toContain('Router')
    expect(pairFailureReason('MIKROTIK_INTERNAL', 'internal error')).toContain('kesalahan')
  })
  it('falls back to the message, then a generic label', () => {
    expect(pairFailureReason('WEIRD', 'pesan')).toBe('pesan')
    expect(pairFailureReason('WEIRD', '')).toBe('Gagal dipasangkan.')
  })
})
