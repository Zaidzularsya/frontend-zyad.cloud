import { describe, expect, it } from 'vitest'

import { buildProductPayload, emptyProductForm, validateProductForm } from './product-form'

describe('product-form', () => {
  it('requires a name and valid numbers', () => {
    expect(validateProductForm(emptyProductForm())).toBe('Nama produk wajib diisi.')
    const f = { ...emptyProductForm(), name: 'Internet 50 Mbps' }
    expect(validateProductForm({ ...f, basePrice: 'abc' })).toBe('Harga harus berupa angka.')
    expect(validateProductForm({ ...f, taxPercent: '101' })).toBe('Pajak harus antara 0 dan 100.')
    expect(validateProductForm({ ...f, basePrice: 'Rp 350.000' })).toBeNull()
  })

  it('normalizes Indonesian amounts and trims fields', () => {
    const payload = buildProductPayload({
      ...emptyProductForm(),
      name: ' Internet ',
      sku: ' NET-50 ',
      basePrice: 'Rp 1.500.000,50',
      taxPercent: '11',
      unit: 'bulan',
    })
    expect(payload).toEqual({
      name: 'Internet',
      sku: 'NET-50',
      base_price: '1500000.50',
      tax_percent: '11',
      unit: 'bulan',
      description: undefined,
      category_id: undefined,
      is_active: true,
    })
  })

  it('sends empty sku/category as empty string on edit so the server clears them', () => {
    const payload = buildProductPayload({ ...emptyProductForm(), name: 'A' }, { editing: true })
    expect(payload.sku).toBe('')
    expect(payload.category_id).toBe('')
  })
})
