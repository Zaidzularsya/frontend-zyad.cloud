import { describe, expect, it } from 'vitest'

import type { CatalogFeatureDef } from '@/features/catalog/api/catalog.api'

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
      charge_type: 'one_time',
      billing_frequency: null,
      payment_timing: 'prepaid',
      is_active: true,
    })
  })

  it('sends empty sku/category as empty string on edit so the server clears them', () => {
    const payload = buildProductPayload({ ...emptyProductForm(), name: 'A' }, { editing: true })
    expect(payload.sku).toBe('')
    expect(payload.category_id).toBe('')
  })

  it('sends recurring pricing attributes with the chosen frequency', () => {
    const payload = buildProductPayload({
      ...emptyProductForm(),
      name: 'Domain',
      chargeType: 'recurring',
      frequency: 'annual',
      paymentTiming: 'postpaid',
    })
    expect(payload).toMatchObject({
      charge_type: 'recurring',
      billing_frequency: 'annual',
      payment_timing: 'postpaid',
    })
  })

  it('drops the frequency for one_time even if a stale value remains in the form', () => {
    const payload = buildProductPayload({
      ...emptyProductForm(),
      name: 'Instalasi',
      chargeType: 'one_time',
      frequency: 'monthly',
    })
    expect(payload.billing_frequency).toBeNull()
  })

  describe('publikasi & fitur (platform)', () => {
    const defs: CatalogFeatureDef[] = [
      { key: 'crm', name: 'CRM', module: 'crm', value_type: 'boolean' },
      { key: 'users', name: 'Jumlah user', module: 'core', value_type: 'integer', unit: 'user' },
    ]
    const base = { ...emptyProductForm(), name: 'Freelancer' }
    const platform = { platform: true, featureDefs: defs }

    it('requires a listing code and a category when public', () => {
      expect(validateProductForm({ ...base, isPublic: true, categoryId: 'c1' }, platform)).toBe(
        'Kode listing wajib bila tampil di pricing page.',
      )
      expect(validateProductForm({ ...base, isPublic: true, listingCode: 'free' }, platform)).toBe(
        'Kategori wajib bila tampil di pricing page.',
      )
    })

    it('rejects a malformed listing code', () => {
      expect(
        validateProductForm(
          { ...base, isPublic: true, categoryId: 'c1', listingCode: 'Free Lancer' },
          platform,
        ),
      ).toContain('huruf kecil')
    })

    it('rejects inactive or invalid feature rows', () => {
      const withRow = (row: { key: string; raw: string | boolean }) => ({
        ...base,
        features: [{ ...row, displayLabel: '' }],
      })
      expect(validateProductForm(withRow({ key: 'lama', raw: true }), platform)).toContain(
        'tidak aktif',
      )
      expect(validateProductForm(withRow({ key: 'users', raw: '5,5' }), platform)).toBe(
        'Jumlah user: Harus bilangan bulat.',
      )
    })

    it('does not send listing or features for a non-platform catalog', () => {
      const payload = buildProductPayload({ ...base, isPublic: true, listingCode: 'x' })
      expect(payload).not.toHaveProperty('is_public')
      expect(payload).not.toHaveProperty('features')
    })

    it('sends typed feature values with position = row index for platform', () => {
      const payload = buildProductPayload(
        {
          ...base,
          isPublic: true,
          categoryId: 'c1',
          listingCode: 'freelancer',
          listingOrder: '2',
          features: [
            { key: 'users', raw: '5', displayLabel: 'Hingga 5 user' },
            { key: 'crm', raw: true, displayLabel: '' },
          ],
        },
        platform,
      )
      expect(payload).toMatchObject({
        is_public: true,
        listing_code: 'freelancer',
        listing_order: 2,
      })
      expect(payload.features).toEqual([
        { feature_key: 'users', value: 5, display_label: 'Hingga 5 user', position: 0 },
        { feature_key: 'crm', value: true, display_label: undefined, position: 1 },
      ])
    })
  })
})
