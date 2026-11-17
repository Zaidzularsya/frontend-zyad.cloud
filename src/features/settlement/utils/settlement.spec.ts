import { describe, expect, it } from 'vitest'

import {
  buildEntryPayload,
  entryKindLabel,
  settlementErrorMessage,
  todayWib,
  validateEntryForm,
} from './settlement'

describe('validateEntryForm', () => {
  it('requires a positive amount for setoran', () => {
    expect(validateEntryForm({ kind: 'settlement', amount: '', note: '' })).toMatch(/Jumlah/)
    expect(validateEntryForm({ kind: 'settlement', amount: '-5', note: '' })).toMatch(
      /lebih dari 0/,
    )
    expect(validateEntryForm({ kind: 'settlement', amount: '0', note: '' })).toMatch(/lebih dari 0/)
    expect(validateEntryForm({ kind: 'settlement', amount: '1000', note: '' })).toBeNull()
  })

  it('requires a note for adjustment but accepts negative amounts', () => {
    expect(validateEntryForm({ kind: 'adjustment', amount: '-500', note: '  ' })).toMatch(/Catatan/)
    expect(validateEntryForm({ kind: 'adjustment', amount: '-500', note: 'koreksi' })).toBeNull()
    expect(validateEntryForm({ kind: 'adjustment', amount: '0', note: 'x' })).toMatch(
      /tidak boleh 0/,
    )
  })

  it('rejects malformed amounts', () => {
    expect(validateEntryForm({ kind: 'settlement', amount: '1.5.0', note: '' })).toMatch(/format/i)
    expect(validateEntryForm({ kind: 'settlement', amount: '1,5', note: '' })).toMatch(/format/i)
  })
})

describe('buildEntryPayload', () => {
  it('normalizes amount to a 2dp string and sends occurred_at at WIB midnight', () => {
    expect(
      buildEntryPayload({ kind: 'settlement', amount: '1500', note: ' ok ', date: '2026-10-25' }),
    ).toEqual({
      kind: 'settlement',
      amount: '1500.00',
      note: 'ok',
      occurred_at: '2026-10-25T00:00:00+07:00',
    })
    expect(
      buildEntryPayload({ kind: 'adjustment', amount: '-10.5', note: 'n', date: '2026-10-25' })
        .amount,
    ).toBe('-10.50')
  })
})

describe('helpers', () => {
  it('computes today in WIB', () => {
    expect(todayWib(new Date('2026-10-24T18:00:00Z'))).toBe('2026-10-25')
    expect(todayWib(new Date('2026-10-24T16:59:00Z'))).toBe('2026-10-24')
  })
  it('maps backend error codes to Indonesian', () => {
    const err = (code: string) => ({ response: { data: { code } } })
    expect(settlementErrorMessage(err('SETTLEMENT_EXCEEDS_BALANCE'))).toBe(
      'Setoran melebihi saldo yang tersisa',
    )
    expect(settlementErrorMessage(err('ADJUSTMENT_BELOW_ZERO'))).toBe(
      'Penyesuaian membuat saldo kurang dari nol',
    )
    expect(
      settlementErrorMessage({
        response: { data: { error: { code: 'SETTLEMENT_EXCEEDS_BALANCE' } } },
      }),
    ).toBe('Setoran melebihi saldo yang tersisa')
  })
  it('labels kinds', () => {
    expect(entryKindLabel('payment')).toBe('Pembayaran')
    expect(entryKindLabel('settlement')).toBe('Setoran')
    expect(entryKindLabel('adjustment')).toBe('Penyesuaian')
  })
})
