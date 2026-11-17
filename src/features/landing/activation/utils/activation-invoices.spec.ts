import { describe, expect, it } from 'vitest'

import {
  buildRenewPayload,
  canRenew,
  invoiceStateLabel,
  paymentShareUrl,
  renewErrorMessage,
  validateRenewForm,
  type ActivationInvoiceRow,
} from './activation-invoices'

const row = (over: Partial<ActivationInvoiceRow> = {}): ActivationInvoiceRow => ({
  id: 'a1',
  page_id: 'p1',
  page_title: 'Undangan Budi',
  page_slug: 'undangan-budi',
  page_status: 'draft',
  page_active_until: null,
  invoice_id: 'inv-1',
  buyer_name: 'Budi',
  buyer_contact: '081234567890',
  buyer_email: null,
  price: '150000.00',
  duration_value: 1,
  duration_unit: 'month',
  invoice_due_at: '2026-10-26T05:00:00Z',
  status: 'open',
  state: 'awaiting_payment',
  paid_at: null,
  created_at: '2026-10-26T04:00:00Z',
  payment_url: 'https://zyad.cloud/i/PAY',
  ...over,
})

describe('invoiceStateLabel', () => {
  it('memberi label yang relevan untuk reseller', () => {
    expect(invoiceStateLabel.awaiting_payment).toBe('Menunggu pembayaran')
    expect(invoiceStateLabel.expired).toBe('Preview kedaluwarsa')
    expect(invoiceStateLabel.paid).toBe('Lunas')
    expect(invoiceStateLabel.void).toBe('Dibatalkan')
  })
})

describe('canRenew', () => {
  it.each([
    ['awaiting_payment', true],
    ['expired', true],
    ['paid', false],
    ['void', false],
  ] as const)('%s -> %s', (state, expected) => {
    expect(canRenew(row({ state }))).toBe(expected)
  })

  it('tidak bisa diperbarui tanpa invoice', () => {
    expect(canRenew(row({ invoice_id: null }))).toBe(false)
  })
})

describe('buildRenewPayload / validateRenewForm', () => {
  it('jam atau hari, tidak keduanya', () => {
    expect(buildRenewPayload(48, 'hour')).toEqual({ invoice_due_hours: 48 })
    expect(buildRenewPayload(3, 'day')).toEqual({ invoice_due_days: 3 })
  })

  it('batas sama dengan backend (jam 1-720, hari 1-30)', () => {
    expect(validateRenewForm(24, 'hour')).toBeNull()
    expect(validateRenewForm(720, 'hour')).toBeNull()
    expect(validateRenewForm(721, 'hour')).toContain('1–720')
    expect(validateRenewForm(0, 'hour')).not.toBeNull()
    expect(validateRenewForm(30, 'day')).toBeNull()
    expect(validateRenewForm(31, 'day')).toContain('1–30')
    expect(validateRenewForm(1.5, 'day')).not.toBeNull()
    expect(validateRenewForm(Number.NaN, 'hour')).not.toBeNull()
  })
})

describe('paymentShareUrl', () => {
  it('membuka WhatsApp ke nomor pelanggan dengan link pembayaran', () => {
    const url = paymentShareUrl(row())
    expect(url?.startsWith('https://wa.me/6281234567890?text=')).toBe(true)
    const text = decodeURIComponent(url!.split('?text=')[1] ?? '')
    expect(text).toContain('https://zyad.cloud/i/PAY')
    expect(text).toContain('Undangan Budi')
    expect(text).not.toMatch(/preview/i)
  })

  it('null bila tidak ada link bayar atau nomor tidak valid', () => {
    expect(paymentShareUrl(row({ payment_url: '' }))).toBeNull()
    expect(paymentShareUrl(row({ buyer_contact: '0812' }))).toBeNull()
  })
})

describe('renewErrorMessage', () => {
  const err = (status: number, code = '', message = '') => ({
    response: { status, data: { code, message } },
  })

  it('invoice sudah dibayar/dibatalkan', () => {
    expect(renewErrorMessage(err(409, 'ACTIVATION_NOT_OPEN'))).toContain('sudah dibayar')
  })

  it('tanpa domain: memakai pesan dari server yang bisa ditindaklanjuti', () => {
    expect(
      renewErrorMessage(err(422, 'ACTIVATION_NO_PUBLIC_HOST', 'Tambahkan domain aktif dulu.')),
    ).toBe('Tambahkan domain aktif dulu.')
  })

  it('fitur belum aktif dan galat umum', () => {
    expect(renewErrorMessage(err(403))).toContain('belum aktif')
    expect(renewErrorMessage(new Error('x'))).toBe('Gagal memperbarui link. Coba lagi.')
  })
})
