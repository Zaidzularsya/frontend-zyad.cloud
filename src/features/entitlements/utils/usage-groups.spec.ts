import { describe, expect, it } from 'vitest'

import type { EntitlementSummaryItem } from '../types'
import { groupUsage } from './usage-groups'

const q = (
  feature_key: string,
  module: string,
  over: Partial<EntitlementSummaryItem> = {},
): EntitlementSummaryItem => ({
  feature_key,
  module,
  name: feature_key,
  state: 'quota',
  limit: 10,
  used: 2,
  remaining: 8,
  reset_strategy: 'never',
  at_limit: false,
  ...over,
})

describe('groupUsage', () => {
  it('puts monthly items in billing group', () => {
    const groups = groupUsage([
      q('crm.max_leads', 'crm'),
      q('crm.max_quotations_per_month', 'crm', { reset_strategy: 'monthly' }),
      q('receivable.max_invoices_per_month', 'receivable', { reset_strategy: 'monthly' }),
    ])
    expect(groups.map((g) => g.title)).toEqual(['CRM', 'Penjualan & Billing (per bulan)'])
    expect(groups[1]!.rows.map((r) => r.key)).toEqual([
      'crm.max_quotations_per_month',
      'receivable.max_invoices_per_month',
    ])
  })

  it('drops hidden items and non-quota gates', () => {
    const groups = groupUsage([
      q('crm.max_leads', 'crm'),
      q('crm.pipeline', 'crm', { state: 'hidden' }),
      q('crm.enabled', 'crm', { state: 'unlimited' }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]!.rows.map((r) => r.key)).toEqual(['crm.max_leads'])
  })

  it('marks at_limit items as full', () => {
    const [group] = groupUsage([q('crm.max_leads', 'crm', { used: 10, at_limit: true })])
    expect(group!.rows[0]).toMatchObject({ atLimit: true, percent: 100, label: 'Lead' })
  })

  it('formats storage bytes and keeps unknown quota rows', () => {
    const groups = groupUsage([
      q('storage.max_bytes', 'storage', {
        used: 120 * 1024 * 1024,
        limit: 500 * 1024 * 1024,
      }),
      q('landing.max_sections_per_page', 'landing', { used: undefined }),
      q('foo.max_bar', 'foo', { name: 'Bar' }),
    ])
    const rows = groups.flatMap((g) => g.rows)
    expect(rows.find((r) => r.key === 'storage.max_bytes')?.format).toBe('120.0 MB / 500.0 MB')
    expect(rows.find((r) => r.key === 'landing.max_sections_per_page')?.percent).toBeUndefined()
    expect(rows.some((r) => r.key === 'foo.max_bar')).toBe(true)
  })

  it('treats null used/limit as absent: no bar and never prints "null"', () => {
    const groups = groupUsage([
      q('landing.max_sections_per_page', 'landing', { used: null, limit: 12, remaining: null }),
      q('foo.max_bar', 'foo', { used: null, limit: null, remaining: null }),
      q('foo.max_baz', 'foo', { used: 3, limit: null, remaining: null }),
    ])
    const rows = groups.flatMap((g) => g.rows)
    const sections = rows.find((r) => r.key === 'landing.max_sections_per_page')!
    expect(sections.format).toBe('batas 12')
    expect(sections.percent).toBeUndefined()
    expect(rows.find((r) => r.key === 'foo.max_bar')!.format).toBe('-')
    expect(rows.find((r) => r.key === 'foo.max_baz')!.format).toBe('3')
    expect(rows.map((r) => r.format).join(' ')).not.toContain('null')
  })

  it('excludes media.max_storage_mb (duplicate of storage.max_bytes)', () => {
    const groups = groupUsage([
      q('media.max_storage_mb', 'media', { used: null, limit: 500 }),
      q('storage.max_bytes', 'storage', { used: 1, limit: 2 }),
    ])
    expect(groups.flatMap((g) => g.rows.map((r) => r.key))).toEqual(['storage.max_bytes'])
  })
})
