import { describe, expect, it } from 'vitest'

import {
  blankLine,
  buildItemsPayload,
  computeTotals,
  lineFromProduct,
  validateLines,
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
      },
      {
        product_id: undefined,
        description: 'Instalasi',
        quantity: '1',
        unit_price: '500000',
        discount_percent: undefined,
        tax_percent: '0',
        unit: undefined,
      },
    ])
  })
})
