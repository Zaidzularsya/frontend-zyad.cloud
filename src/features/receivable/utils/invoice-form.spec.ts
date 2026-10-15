import { describe, expect, it } from 'vitest'

import type { CatalogProduct } from '@/features/catalog/api/catalog.api'
import { blankLine, lineFromProduct } from '@/features/crm/quotations/utils/quotation-editor'
import {
  blankInvoiceForm,
  buildInvoicePayload,
  formFromInvoice,
  validateInvoiceForm,
  validatePayment,
} from '@/features/receivable/utils/invoice-form'
import type { Invoice } from '@/features/receivable/api/receivable.api'

const product = {
  id: 'p1',
  sku: 'NET-50',
  name: 'Internet 50 Mbps',
  unit: 'bulan',
  base_price: '300000.00',
  tax_percent: '11.00',
  charge_type: 'recurring',
  billing_frequency: 'monthly',
  payment_timing: 'prepaid',
} as CatalogProduct

describe('buildInvoicePayload', () => {
  it('maps a catalog line and a free line, keeping pricing attributes', () => {
    const free = { ...blankLine(), description: 'Instalasi', unitPrice: '33.000' }
    const form = {
      ...blankInvoiceForm(['email']),
      accountId: 'a1',
      notes: ' Terima kasih ',
      lines: [lineFromProduct(product), free],
    }
    const p = buildInvoicePayload(form)
    expect(p.account_id).toBe('a1')
    expect(p.channels).toEqual(['email'])
    expect(p.notes).toBe('Terima kasih')
    expect(p.items[0]).toMatchObject({
      product_id: 'p1',
      description: 'Internet 50 Mbps',
      unit_price: '300000.00',
      tax_percent: '11.00',
      unit: 'bulan',
      charge_type: 'recurring',
      billing_frequency: 'monthly',
      payment_timing: 'prepaid',
    })
    expect(p.items[1]).toMatchObject({
      description: 'Instalasi',
      unit_price: '33000',
      charge_type: 'one_time',
    })
    expect(p.items[1]?.product_id).toBeUndefined()
  })

  it('recurring lines inherit the invoice period, one-time lines do not', () => {
    const form = {
      ...blankInvoiceForm(['email']),
      accountId: 'a1',
      periodStart: '2026-10-01',
      periodEnd: '2026-10-31',
      lines: [
        lineFromProduct(product),
        { ...blankLine(), description: 'Instalasi', unitPrice: '1' },
      ],
    }
    const p = buildInvoicePayload(form)
    expect(p.period_start).toBe('2026-10-01')
    expect(p.period_end).toBe('2026-10-31')
    expect(p.items[0]).toMatchObject({ period_start: '2026-10-01', period_end: '2026-10-31' })
    expect(p.items[1]?.period_start).toBeUndefined()
  })

  it('omits empty optional fields', () => {
    const p = buildInvoicePayload({
      ...blankInvoiceForm(['email', 'whatsapp']),
      accountId: 'a1',
      lines: [{ ...blankLine(), description: 'x', unitPrice: '1' }],
    })
    expect(p.pic_user_id).toBeUndefined()
    expect(p.period_start).toBeUndefined()
    expect(p.notes).toBeUndefined()
    expect(p.channels).toEqual(['email', 'whatsapp'])
  })
})

describe('blankInvoiceForm', () => {
  it('starts with the default channels from settings (never empty)', () => {
    expect(blankInvoiceForm(['whatsapp']).channels).toEqual(['whatsapp'])
    expect(blankInvoiceForm([]).channels).toEqual(['email'])
  })
})

describe('formFromInvoice', () => {
  it('restores an editable form from a draft', () => {
    const inv = {
      id: 'i1',
      status: 'draft',
      account: { id: 'a1', name: 'Budi' },
      channels: ['whatsapp'],
      pic_user_id: 'u1',
      notes: 'catatan',
      period_start: '2026-10-01',
      period_end: '2026-10-31',
      items: [
        {
          id: 'it1',
          description: 'Internet',
          quantity: '1.00',
          unit: 'bulan',
          unit_price: '300000.00',
          discount_percent: null,
          tax_percent: '11.00',
          product_id: 'p1',
          sku: 'NET-50',
          charge_type: 'recurring',
          billing_frequency: 'monthly',
          payment_timing: 'prepaid',
        },
      ],
    } as unknown as Invoice
    const f = formFromInvoice(inv)
    expect(f).toMatchObject({
      accountId: 'a1',
      channels: ['whatsapp'],
      picUserId: 'u1',
      notes: 'catatan',
      periodStart: '2026-10-01',
      periodEnd: '2026-10-31',
    })
    expect(f.lines[0]).toMatchObject({
      productId: 'p1',
      description: 'Internet',
      taxPercent: '11.00',
    })
    expect(f.lines[0]?.pricing).toEqual({
      charge_type: 'recurring',
      billing_frequency: 'monthly',
      payment_timing: 'prepaid',
    })
  })
})

describe('validateInvoiceForm', () => {
  const ok = {
    ...blankInvoiceForm(['email']),
    accountId: 'a1',
    lines: [{ ...blankLine(), description: 'x', unitPrice: '1' }],
  }

  it('accepts a complete form', () => {
    expect(validateInvoiceForm(ok)).toBeNull()
  })

  it('requires account, a channel and valid lines', () => {
    expect(validateInvoiceForm({ ...ok, accountId: '' })).toBe('Pilih pelanggan.')
    expect(validateInvoiceForm({ ...ok, channels: [] })).toBe(
      'Pilih minimal satu kanal pengiriman.',
    )
    expect(validateInvoiceForm({ ...ok, lines: [] })).toBe('Tambahkan minimal satu item.')
    expect(
      validateInvoiceForm({ ...ok, lines: [{ ...blankLine(), description: '', unitPrice: '1' }] }),
    ).toBe('Item 1: deskripsi wajib diisi.')
  })

  it('rejects an inverted period', () => {
    expect(validateInvoiceForm({ ...ok, periodStart: '2026-10-31', periodEnd: '2026-10-01' })).toBe(
      'Akhir periode tidak boleh sebelum awal periode.',
    )
    expect(validateInvoiceForm({ ...ok, periodStart: '2026-10-01', periodEnd: '' })).toBe(
      'Isi kedua tanggal periode atau kosongkan keduanya.',
    )
  })
})

describe('validatePayment', () => {
  it('rejects zero, non-numbers and amounts above the balance', () => {
    expect(validatePayment('0', '100')).toBe('Jumlah harus lebih dari 0.')
    expect(validatePayment('', '100')).toBe('Jumlah harus berupa angka.')
    expect(validatePayment('abc', '100')).toBe('Jumlah harus berupa angka.')
    expect(validatePayment('150', '100')).toBe('Jumlah melebihi sisa tagihan (Rp 100).')
  })

  it('accepts amounts up to the balance, in Indonesian formats too', () => {
    expect(validatePayment('100', '100')).toBeNull()
    expect(validatePayment('99,5', '100')).toBeNull()
    expect(validatePayment('1.000', '1000.00')).toBeNull()
    expect(validatePayment('233.000', '233000.00')).toBeNull()
    expect(validatePayment('233.000,01', '233000.00')).toBe(
      'Jumlah melebihi sisa tagihan (Rp 233.000).',
    )
  })

  it('rejects more than two decimals', () => {
    expect(validatePayment('1,234', '100')).toBe('Jumlah harus berupa angka.')
  })
})
