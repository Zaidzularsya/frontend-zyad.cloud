import { describe, expect, it } from 'vitest'

import { usePairSelection } from '@/features/mikrotik/composables/usePairSelection'
import { secret } from '@/features/mikrotik/testing/fixtures'

const green = (id: string, account: string) =>
  secret({
    id,
    suggestion: {
      account_id: account,
      account_name: 'Budi',
      account_phone: '0812',
      basis: 'phone',
      candidates: 1,
    },
  })
const yellow = (id: string) =>
  secret({
    id,
    suggestion: {
      account_id: '',
      account_name: '',
      account_phone: '',
      basis: 'ambiguous',
      candidates: 2,
    },
  })

describe('usePairSelection', () => {
  it('selects all green rows by default and ignores yellow, red and paired rows', () => {
    const sel = usePairSelection()
    sel.selectAllSuggested([
      green('a', 'acc1'),
      green('b', 'acc2'),
      yellow('c'),
      secret({ id: 'd', needs_original_profile: true }),
      secret({ id: 'e', account_id: 'acc9' }),
    ])
    expect([...sel.selected.entries()]).toEqual([
      ['a', 'acc1'],
      ['b', 'acc2'],
    ])
    expect(sel.count.value).toBe(2)
  })

  it('clear releases one row and re-running selectAllSuggested does not bring it back', () => {
    const sel = usePairSelection()
    const rows = [green('a', 'acc1'), green('b', 'acc2')]
    sel.selectAllSuggested(rows)
    sel.clear('a')
    expect(sel.count.value).toBe(1)
    sel.selectAllSuggested(rows)
    expect(sel.selected.has('a')).toBe(false)
  })

  it('toggle adds then removes and setAccount sets a manual pick', () => {
    const sel = usePairSelection()
    sel.toggle('x', 'acc1')
    expect(sel.selected.get('x')).toBe('acc1')
    sel.toggle('x', 'acc1')
    expect(sel.selected.has('x')).toBe(false)
    sel.setAccount('y', 'acc2')
    expect(sel.selected.get('y')).toBe('acc2')
    expect(sel.count.value).toBe(1)
  })

  it('allows the same account for two secrets, but a secret appears once', () => {
    const sel = usePairSelection()
    sel.setAccount('a', 'acc1')
    sel.setAccount('b', 'acc1')
    sel.setAccount('a', 'acc2')
    expect(sel.count.value).toBe(2)
    expect(sel.selected.get('a')).toBe('acc2')
    expect(sel.selected.get('b')).toBe('acc1')
  })

  it('reset empties the selection', () => {
    const sel = usePairSelection()
    sel.setAccount('a', 'acc1')
    sel.reset()
    expect(sel.count.value).toBe(0)
  })

  describe('syncRows after a refetch', () => {
    it('updates a non-manual entry to the new suggestion account', () => {
      const sel = usePairSelection()
      sel.selectAllSuggested([green('a', 'acc1')])
      sel.syncRows([green('a', 'acc2')])
      expect(sel.selected.get('a')).toBe('acc2')
    })

    it('drops a non-manual entry whose suggestion became ambiguous or disappeared', () => {
      const sel = usePairSelection()
      sel.selectAllSuggested([green('a', 'acc1'), green('b', 'acc2')])
      sel.syncRows([yellow('a'), secret({ id: 'b' })])
      expect(sel.count.value).toBe(0)
    })

    it('keeps a manual pick even when the suggestion differs', () => {
      const sel = usePairSelection()
      sel.setAccount('a', 'manual')
      sel.syncRows([green('a', 'acc9')])
      expect(sel.selected.get('a')).toBe('manual')
    })

    it('drops rows that became paired or need an original profile', () => {
      const sel = usePairSelection()
      sel.setAccount('a', 'x')
      sel.setAccount('b', 'y')
      sel.syncRows([
        secret({ id: 'a', account_id: 'x' }),
        secret({ id: 'b', needs_original_profile: true }),
      ])
      expect(sel.count.value).toBe(0)
    })

    it('prune removes given ids', () => {
      const sel = usePairSelection()
      sel.setAccount('a', 'x')
      sel.setAccount('b', 'y')
      sel.prune(['a'])
      expect([...sel.selected.keys()]).toEqual(['b'])
    })
  })

  describe('toggleRow (C1: shown account == sent account)', () => {
    it('pick A -> untick -> re-tick follows the suggestion B, never the old pick', () => {
      const sel = usePairSelection()
      const row = green('a', 'accB')
      sel.setAccount('a', 'accA')
      sel.toggleRow(row) // untick
      expect(sel.selected.has('a')).toBe(false)
      sel.toggleRow(row) // re-tick
      expect(sel.selected.get('a')).toBe('accB')
      // not manual anymore: follows later suggestion changes
      sel.syncRows([green('a', 'accC')])
      expect(sel.selected.get('a')).toBe('accC')
    })

    it('pick A -> clear (X) -> tick follows the suggestion', () => {
      const sel = usePairSelection()
      const row = green('a', 'accB')
      sel.setAccount('a', 'accA')
      sel.clear('a')
      sel.toggleRow(row)
      expect(sel.selected.get('a')).toBe('accB')
    })

    it('does nothing for a row without a suggestion account', () => {
      const sel = usePairSelection()
      sel.toggleRow(yellow('y'))
      expect(sel.count.value).toBe(0)
    })
  })
})
