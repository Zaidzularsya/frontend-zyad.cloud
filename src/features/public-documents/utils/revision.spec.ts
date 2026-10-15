import { describe, expect, it } from 'vitest'

import { REVISION_CATEGORIES, validateApprove, validateRevision } from './revision'

describe('public quotation forms', () => {
  it('validates revision and approve forms', () => {
    expect(validateApprove({ name: 'Budi', agree: false })).toBe(
      'Centang persetujuan terlebih dahulu.',
    )
    expect(validateApprove({ name: 'B', agree: true })).toBe('Nama minimal 2 karakter.')
    expect(validateApprove({ name: ' Budi ', agree: true })).toBeNull()
    expect(validateRevision({ name: 'Budi', categories: [], note: '' })).toBe(
      'Pilih minimal satu bagian yang perlu direvisi.',
    )
    expect(validateRevision({ name: 'Budi', categories: ['other'], note: ' ' })).toBe(
      'Jelaskan revisi yang diinginkan pada catatan.',
    )
    expect(validateRevision({ name: 'Budi', categories: ['price'], note: 'x'.repeat(2001) })).toBe(
      'Catatan maksimal 2.000 karakter.',
    )
    expect(validateRevision({ name: 'Budi', categories: ['price'], note: '' })).toBeNull()
    expect(validateRevision({ name: 'x', categories: ['price'], note: '' })).toBe(
      'Nama minimal 2 karakter.',
    )
    expect(validateApprove({ name: 'x'.repeat(151), agree: true })).toBe(
      'Nama maksimal 150 karakter.',
    )
    expect(REVISION_CATEGORIES.map((c) => c.value)).toEqual([
      'price',
      'quantity',
      'items',
      'specification',
      'schedule',
      'payment_terms',
      'validity',
      'other',
    ])
    expect(REVISION_CATEGORIES.map((c) => c.label)).toEqual([
      'Harga/diskon',
      'Kuantitas',
      'Item/produk',
      'Spesifikasi/deskripsi',
      'Jadwal pelaksanaan',
      'Syarat pembayaran',
      'Masa berlaku',
      'Lainnya',
    ])
  })
})
