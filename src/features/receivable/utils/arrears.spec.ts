import { describe, expect, it } from 'vitest'

import { arrearsTotal, buildArrearsPayload, validateArrears, type ArrearsRow } from './arrears'

const row = (over: Partial<ArrearsRow> = {}): ArrearsRow => ({
  period_start: '2026-08-05',
  period_end: '2026-09-04',
  amount: '333000',
  due_date: '2026-08-12',
  isolir_flag: false,
  ...over,
})

describe('validateArrears', () => {
  const today = '2026-11-13'

  it('accepts a valid recording', () => {
    expect(validateArrears('Tunggakan lama', [row()], today)).toEqual([])
  })

  it('requires a reason', () => {
    expect(validateArrears('   ', [row()], today)).toContain('Alasan wajib diisi.')
  })

  it('requires at least one row and at most 24', () => {
    expect(validateArrears('x', [], today)).toContain('Pilih minimal satu periode.')
    const many = Array.from({ length: 25 }, () => row())
    expect(validateArrears('x', many, today)).toContain(
      'Maksimal 24 periode dalam satu pencatatan.',
    )
  })

  it('rejects a due date after today', () => {
    expect(validateArrears('x', [row({ due_date: '2026-11-14' })], today)).toEqual([
      'Periode 5 Agu 2026: jatuh tempo tidak boleh setelah hari ini.',
    ])
  })

  it('rejects empty, zero, negative and malformed amounts', () => {
    for (const amount of ['', '0', '-1', 'abc', '12,345']) {
      expect(validateArrears('x', [row({ amount })], today)[0]).toMatch(/jumlah harus lebih dari 0/)
    }
  })

  it('accepts Indonesian formatted amounts', () => {
    expect(validateArrears('x', [row({ amount: 'Rp 333.000' })], today)).toEqual([])
  })
})

describe('arrearsTotal', () => {
  it('sums decimals without float drift', () => {
    expect(arrearsTotal([row({ amount: '0.1' }), row({ amount: '0.2' })])).toBe('0.30')
    expect(arrearsTotal([row({ amount: '333.000' }), row({ amount: '250000,50' })])).toBe(
      '583000.50',
    )
  })

  it('ignores invalid amounts', () => {
    expect(arrearsTotal([row({ amount: 'x' }), row({ amount: '10' })])).toBe('10.00')
  })
})

describe('buildArrearsPayload', () => {
  it('normalizes amounts and keeps the flag', () => {
    expect(
      buildArrearsPayload('acc', 'ctr', ' lama ', [
        row({ amount: 'Rp 333.000', isolir_flag: true }),
      ]),
    ).toEqual({
      account_id: 'acc',
      contract_id: 'ctr',
      reason: 'lama',
      rows: [
        { period_start: '2026-08-05', amount: '333000', due_date: '2026-08-12', isolir_flag: true },
      ],
    })
  })
})
