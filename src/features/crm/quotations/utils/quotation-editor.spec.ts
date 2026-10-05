import { describe, expect, it } from 'vitest'

import { DEFAULT_PRICING } from '@/features/catalog/utils/pricing'

import {
  blankLine,
  buildItemsPayload,
  computeTotals,
  formatRupiah,
  lineFromProduct,
  validateLines,
  type EditorLine,
} from './quotation-editor'

const line = (over: Partial<ReturnType<typeof blankLine>>) => ({ ...blankLine(), ...over })

describe('computeTotals', () => {
  it('rounds per line exactly like the server', () => {
    const t = computeTotals([
      line({
        description: 'Router',
        quantity: '3',
        unitPrice: '33333.33',
        discountPercent: '10',
        taxPercent: '11',
      }),
      line({ description: 'Instalasi', quantity: '1', unitPrice: '500000' }),
    ])
    expect(t.lines[0]).toEqual({
      gross: '99999.99',
      discount: '10000.00',
      net: '89999.99',
      tax: '9900.00',
    })
    expect(t).toMatchObject({
      subtotal: '599999.99',
      discountTotal: '10000.00',
      taxTotal: '9900.00',
      grandTotal: '599899.99',
    })
  })

  it('handles 33.33% discount and Indonesian input formats', () => {
    const t = computeTotals([
      line({ description: 'A', quantity: '1', unitPrice: '300.000', discountPercent: '33,33' }),
    ])
    expect(t.discountTotal).toBe('99990.00')
  })
})

describe('validate & payload', () => {
  it('flags empty description, bad numbers and out-of-range percents', () => {
    expect(validateLines([])).toBe('Tambahkan minimal satu item.')
    expect(validateLines([line({ description: '' })])).toBe('Item 1: deskripsi wajib diisi.')
    expect(validateLines([line({ description: 'A', unitPrice: 'abc' })])).toBe(
      'Item 1: harga harus berupa angka.',
    )
    expect(validateLines([line({ description: 'A', unitPrice: '1', taxPercent: '101' })])).toBe(
      'Item 1: pajak harus 0–100.',
    )
    expect(validateLines([line({ description: 'A', unitPrice: '1' })])).toBeNull()
  })

  it('maps product lines and normalizes numbers', () => {
    const fromProduct = lineFromProduct({
      id: 'p1',
      name: 'Internet 50 Mbps',
      sku: 'NET-50',
      unit: 'bulan',
      base_price: '350000.00',
      tax_percent: '11.00',
    } as never)
    const payload = buildItemsPayload([
      { ...fromProduct, quantity: '2' },
      line({ description: 'Instalasi', unitPrice: 'Rp 500.000' }),
    ])
    expect(payload).toEqual([
      {
        product_id: 'p1',
        description: 'Internet 50 Mbps',
        quantity: '2',
        unit_price: '350000.00',
        discount_percent: undefined,
        tax_percent: '11.00',
        unit: 'bulan',
        charge_type: 'one_time',
        billing_frequency: null,
        payment_timing: 'prepaid',
      },
      {
        product_id: undefined,
        description: 'Instalasi',
        quantity: '1',
        unit_price: '500000',
        discount_percent: undefined,
        tax_percent: '0',
        unit: undefined,
        charge_type: 'one_time',
        billing_frequency: null,
        payment_timing: 'prepaid',
      },
    ])
  })
})

describe('formatRupiah', () => {
  it('formats decimal strings like the PDF', () => {
    expect(formatRupiah('1500000.00')).toBe('Rp 1.500.000')
    expect(formatRupiah('1500000.50')).toBe('Rp 1.500.000,50')
    expect(formatRupiah('0')).toBe('Rp 0')
  })
})

describe('pricing attributes', () => {
  it('splits totals by charge type and timing', () => {
    const lines = [
      line({
        description: 'Instalasi',
        unitPrice: '500000',
        pricing: { charge_type: 'one_time', billing_frequency: null, payment_timing: 'prepaid' },
      }),
      line({
        description: 'Internet',
        unitPrice: '300000',
        taxPercent: '11',
        pricing: {
          charge_type: 'recurring',
          billing_frequency: 'monthly',
          payment_timing: 'prepaid',
        },
      }),
      line({
        description: 'Website',
        unitPrice: '5000000',
        pricing: { charge_type: 'one_time', billing_frequency: null, payment_timing: 'postpaid' },
      }),
    ] as EditorLine[]
    const t = computeTotals(lines)
    expect(t.oneTimeTotal).toBe('5500000.00')
    expect(t.firstInvoiceTotal).toBe('833000.00')
    expect(t.recurring).toEqual([{ frequency: 'monthly', label: 'Bulanan', amount: '333000.00' }])
  })

  it('orders mixed frequencies daily to annual and leaves legacy lines without breakdown', () => {
    const t = computeTotals([
      line({
        description: 'Domain',
        unitPrice: '200000',
        pricing: {
          charge_type: 'recurring',
          billing_frequency: 'annual',
          payment_timing: 'prepaid',
        },
      }),
      line({
        description: 'Internet',
        unitPrice: '300000',
        pricing: {
          charge_type: 'recurring',
          billing_frequency: 'monthly',
          payment_timing: 'prepaid',
        },
      }),
    ])
    expect(t.recurring.map((r) => r.frequency)).toEqual(['monthly', 'annual'])
    expect(computeTotals([line({ description: 'A', unitPrice: '10' })]).recurring).toEqual([])
  })

  it('copies catalog pricing and sends it in the payload', () => {
    const l = lineFromProduct({
      id: 'p1',
      name: 'Net',
      unit: 'bulan',
      base_price: '300000',
      tax_percent: '0',
      charge_type: 'recurring',
      billing_frequency: 'monthly',
      payment_timing: 'prepaid',
    } as never)
    expect(l.pricing.billing_frequency).toBe('monthly')
    expect(buildItemsPayload([{ ...l, quantity: '1' }])[0]).toMatchObject({
      charge_type: 'recurring',
      billing_frequency: 'monthly',
      payment_timing: 'prepaid',
    })
    expect(blankLine().pricing).toEqual(DEFAULT_PRICING)
  })
})
