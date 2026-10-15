import { describe, expect, it } from 'vitest'

import type { SubscriptionView } from '@/features/customer/api/self-serve.api'

import { formatDay, invoiceStatusLabel, isPayable, statusBanner } from './subscription-view'

const base: SubscriptionView = {
  status: 'active',
  product: null,
  contract_number: '',
  next_invoice_date: '',
  overdue_days: 0,
  suspend_in_days: null,
  features: [],
  invoices: [],
}

describe('statusBanner', () => {
  it('active → success dengan tanggal tagihan berikutnya', () => {
    const b = statusBanner({ ...base, next_invoice_date: '2026-10-29' })
    expect(b.tone).toBe('success')
    expect(b.title).toBe('Aktif')
    expect(b.text).toBe('Tagihan berikutnya terbit 29 Okt 2026.')
  })

  it('active tanpa tanggal tagihan berikutnya', () => {
    expect(statusBanner(base).text).toBe('Langganan Anda aktif.')
  })

  it('awaiting_payment → info dengan nomor invoice yang belum dibayar', () => {
    const b = statusBanner({
      ...base,
      status: 'awaiting_payment',
      invoices: [
        { number: 'INV-1', status: 'issued', total: '1', period_label: '', due_date: '', url: 'u' },
      ],
    })
    expect(b.tone).toBe('info')
    expect(b.title).toBe('Menunggu pembayaran')
    expect(b.text).toBe('Selesaikan pembayaran invoice INV-1 untuk mengaktifkan paket.')
  })

  it('overdue → warning dengan sisa hari sebelum ditangguhkan', () => {
    const b = statusBanner({ ...base, status: 'overdue', overdue_days: 3, suspend_in_days: 5 })
    expect(b.tone).toBe('warning')
    expect(b.title).toBe('Tagihan lewat jatuh tempo 3 hari')
    expect(b.text).toBe('Workspace ditangguhkan dalam 5 hari bila belum dibayar.')
  })

  it('overdue dengan sisa 0 hari → "hari ini"', () => {
    const b = statusBanner({ ...base, status: 'overdue', overdue_days: 8, suspend_in_days: 0 })
    expect(b.text).toBe('Workspace ditangguhkan hari ini bila belum dibayar.')
  })

  it('free → info paket Free', () => {
    const b = statusBanner({ ...base, status: 'free' })
    expect(b).toEqual({
      tone: 'info',
      title: 'Paket Free',
      text: 'Pilih paket untuk membuka fitur lengkap.',
    })
  })
})

describe('helpers', () => {
  it('isPayable hanya untuk issued/overdue', () => {
    expect(isPayable('issued')).toBe(true)
    expect(isPayable('overdue')).toBe(true)
    expect(isPayable('paid')).toBe(false)
    expect(isPayable('void')).toBe(false)
  })

  it('formatDay memformat tanggal kalender tanpa geser zona waktu', () => {
    expect(formatDay('2026-01-01')).toBe('1 Jan 2026')
    expect(formatDay('')).toBe('-')
  })

  it('invoiceStatusLabel', () => {
    expect(invoiceStatusLabel('paid')).toBe('Lunas')
    expect(invoiceStatusLabel('overdue')).toBe('Lewat jatuh tempo')
    expect(invoiceStatusLabel('xyz')).toBe('xyz')
  })
})
