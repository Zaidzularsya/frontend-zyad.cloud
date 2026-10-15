import { describe, expect, it } from 'vitest'

import {
  defaultGranularity,
  dueLabel,
  percentDelta,
  presetRange,
} from '@/features/crm/leads/utils/lead-dashboard'
import { pageWindow } from '@/lib/pagination'

describe('presetRange', () => {
  it('ends today and is inclusive', () => {
    expect(presetRange('30d', new Date(2026, 8, 28, 15, 0))).toEqual({
      from: '2026-08-30',
      to: '2026-09-28',
    })
    expect(presetRange('7d', new Date(2026, 8, 28))).toEqual({
      from: '2026-09-22',
      to: '2026-09-28',
    })
  })
})

describe('defaultGranularity', () => {
  it('switches to month after 92 days like the backend', () => {
    expect(defaultGranularity('2026-06-29', '2026-09-28')).toBe('day') // 92 days
    expect(defaultGranularity('2026-06-28', '2026-09-28')).toBe('month') // 93 days
  })
})

describe('percentDelta', () => {
  it('rounds the change and has no baseline for zero', () => {
    expect(percentDelta(15, 10)).toBe(50)
    expect(percentDelta(5, 10)).toBe(-50)
    expect(percentDelta(3, 0)).toBeNull()
  })
})

describe('pageWindow', () => {
  it('shows every page when there are few', () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5])
  })
  it('collapses gaps around the current page', () => {
    expect(pageWindow(6, 16)).toEqual([1, '…', 5, 6, 7, '…', 16])
    expect(pageWindow(1, 16)).toEqual([1, 2, '…', 16])
    expect(pageWindow(16, 16)).toEqual([1, '…', 15, 16])
    expect(pageWindow(3, 16)).toEqual([1, 2, 3, 4, '…', 16])
  })
})

describe('dueLabel', () => {
  const now = new Date(2026, 8, 28, 12, 0)
  it('classifies overdue, today, later and undated', () => {
    expect(dueLabel(new Date(2026, 8, 25, 9, 0).toISOString(), now)).toEqual({
      text: 'Terlambat 3 hari',
      tone: 'overdue',
    })
    expect(dueLabel(new Date(2026, 8, 28, 16, 30).toISOString(), now).tone).toBe('today')
    expect(dueLabel(new Date(2026, 8, 28, 9, 0).toISOString(), now).tone).toBe('overdue')
    expect(dueLabel(new Date(2026, 8, 29, 10, 0).toISOString(), now).text).toMatch(/^Besok/)
    expect(dueLabel(null, now)).toEqual({ text: 'Tanpa jadwal', tone: 'none' })
  })
})
