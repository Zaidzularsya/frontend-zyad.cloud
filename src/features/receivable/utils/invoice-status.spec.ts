import { describe, expect, it } from 'vitest'

import {
  INVOICE_STATUS,
  canIssue,
  canPay,
  canSend,
  canVoid,
  isEditable,
} from '@/features/receivable/utils/invoice-status'

describe('INVOICE_STATUS', () => {
  it('labels and tones the five statuses', () => {
    expect(INVOICE_STATUS.draft).toEqual({ label: 'Draft', tone: 'gray' })
    expect(INVOICE_STATUS.issued).toEqual({ label: 'Terbit', tone: 'blue' })
    expect(INVOICE_STATUS.paid).toEqual({ label: 'Lunas', tone: 'green' })
    expect(INVOICE_STATUS.overdue).toEqual({ label: 'Jatuh tempo', tone: 'red' })
    expect(INVOICE_STATUS.void).toEqual({ label: 'Dibatalkan', tone: 'slate' })
  })
})

describe('status capabilities (mirror the backend state machine)', () => {
  it('only a draft can be edited and issued', () => {
    for (const s of ['draft', 'issued', 'paid', 'overdue', 'void'] as const) {
      expect(isEditable(s)).toBe(s === 'draft')
      expect(canIssue(s)).toBe(s === 'draft')
    }
  })

  it('issued, overdue and paid invoices can be sent (paid = receipt)', () => {
    expect(canSend('draft')).toBe(false)
    expect(canSend('void')).toBe(false)
    expect(['issued', 'overdue', 'paid'].every((s) => canSend(s as never))).toBe(true)
  })

  it('only issued and overdue invoices take payments', () => {
    expect(canPay('issued')).toBe(true)
    expect(canPay('overdue')).toBe(true)
    expect(canPay('paid')).toBe(false)
    expect(canPay('draft')).toBe(false)
    expect(canPay('void')).toBe(false)
  })

  it('void needs no payments and a non-final status', () => {
    expect(canVoid('draft', '0.00')).toBe(true)
    expect(canVoid('issued', '0.00')).toBe(true)
    expect(canVoid('overdue', '0.00')).toBe(true)
    expect(canVoid('issued', '100000.00')).toBe(false)
    expect(canVoid('paid', '0.00')).toBe(false)
    expect(canVoid('void', '0.00')).toBe(false)
  })
})
