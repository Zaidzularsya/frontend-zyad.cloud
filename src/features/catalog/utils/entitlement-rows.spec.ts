import { describe, expect, it } from 'vitest'

import type { CatalogFeatureDef } from '@/features/catalog/api/catalog.api'
import {
  applyRowChange,
  availableStatuses,
  statusOfRow,
  valueForStatus,
} from '@/features/catalog/utils/entitlement-rows'
import type { FeatureRow } from '@/features/catalog/utils/product-form'

const bool: CatalogFeatureDef = { key: 'crm', name: 'CRM', module: 'crm', value_type: 'boolean' }
const int: CatalogFeatureDef = { key: 'lead', name: 'Lead', module: 'crm', value_type: 'integer' }
const dec: CatalogFeatureDef = { key: 'fee', name: 'Fee', module: 'core', value_type: 'decimal' }

describe('statusOfRow', () => {
  it('maps boolean and integer', () => {
    expect(statusOfRow(bool, true)).toBe('unlimited')
    expect(statusOfRow(bool, false)).toBe('hidden')
    expect(statusOfRow(int, 50)).toBe('quota')
  })

  it('treats a missing value as unset', () => {
    expect(statusOfRow(bool, undefined)).toBe('unset')
    expect(statusOfRow(int, undefined)).toBe('unset')
  })
})

describe('valueForStatus', () => {
  it('maps statuses to values', () => {
    expect(valueForStatus(bool, 'unlimited')).toBe(true)
    expect(valueForStatus(bool, 'hidden')).toBe(false)
    expect(valueForStatus(int, 'quota', 0)).toBe(0)
    expect(valueForStatus(int, 'quota', 25)).toBe(25)
    expect(valueForStatus(bool, 'unset')).toBeUndefined()
    expect(valueForStatus(int, 'unset')).toBeUndefined()
  })

  it('rejects unsafe integers', () => {
    expect(() => valueForStatus(int, 'quota', 2 ** 53)).toThrow(RangeError)
    expect(applyRowChange([], int, 'quota', '1000000000000000000000').error).toMatch(/bilangan/)
  })

  it('rejects negative or fractional limit', () => {
    expect(() => valueForStatus(int, 'quota', -1)).toThrow(RangeError)
    expect(() => valueForStatus(int, 'quota', 1.5)).toThrow(RangeError)
    expect(() => valueForStatus(int, 'quota', Number.NaN)).toThrow(RangeError)
    expect(() => valueForStatus(int, 'quota')).toThrow(RangeError)
  })

  it('rejects status not allowed for the value type', () => {
    expect(() => valueForStatus(int, 'hidden')).toThrow(RangeError)
    expect(() => valueForStatus(bool, 'quota', 3)).toThrow(RangeError)
  })
})

describe('availableStatuses', () => {
  it('depends on value type', () => {
    expect(availableStatuses(bool)).toEqual(['unset', 'unlimited', 'hidden'])
    expect(availableStatuses(int)).toEqual(['unset', 'quota'])
    expect(availableStatuses(dec)).toEqual([])
  })
})

describe('applyRowChange', () => {
  const none: FeatureRow[] = []

  it('adds a row only when the admin sets it', () => {
    const r = applyRowChange(none, bool, 'hidden')
    expect(r.error).toBeUndefined()
    expect(r.features).toEqual([{ key: 'crm', raw: false, displayLabel: '' }])
  })

  it('unset removes a stored row and frees the cap count', () => {
    const rows: FeatureRow[] = [{ key: 'crm', raw: false, displayLabel: '' }]
    expect(applyRowChange(rows, bool, 'unset').features).toEqual([])
  })

  it('stores an integer limit as text and removes the row when emptied', () => {
    const added = applyRowChange(none, int, 'quota', '50')
    expect(added.features).toEqual([{ key: 'lead', raw: '50', displayLabel: '' }])
    expect(applyRowChange(added.features, int, 'quota', '').features).toEqual([])
  })

  it('clears the custom display label when the value changes, keeps it when unchanged', () => {
    const rows: FeatureRow[] = [{ key: 'crm', raw: true, displayLabel: 'CRM lengkap' }]
    expect(applyRowChange(rows, bool, 'hidden').features).toEqual([
      { key: 'crm', raw: false, displayLabel: '' },
    ])
    expect(applyRowChange(rows, bool, 'unlimited').features).toEqual([
      { key: 'crm', raw: true, displayLabel: 'CRM lengkap' },
    ])
  })

  it('rejects a negative or fractional limit without changing rows', () => {
    expect(applyRowChange(none, int, 'quota', '-3').error).toMatch(/bilangan bulat/)
    expect(applyRowChange(none, int, 'quota', '1.5').features).toBe(none)
  })

  it('blocks adding beyond the 30 feature cap', () => {
    const full: FeatureRow[] = Array.from({ length: 30 }, (_, i) => ({
      key: `k${i}`,
      raw: true,
      displayLabel: '',
    }))
    const r = applyRowChange(full, bool, 'unlimited')
    expect(r.error).toBe('Maksimal 30 fitur per produk.')
    expect(r.features).toBe(full)
    // Mengubah baris yang sudah ada tetap boleh.
    const edit = applyRowChange(full, { ...bool, key: 'k3' }, 'hidden')
    expect(edit.error).toBeUndefined()
    expect(edit.features).toHaveLength(30)
  })
})
