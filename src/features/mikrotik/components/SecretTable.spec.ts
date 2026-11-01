import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: { accounts: { search: vi.fn().mockResolvedValue([]) } },
}))

import type { PppSecret } from '@/features/mikrotik/types'
import SecretTable from '@/features/mikrotik/components/SecretTable.vue'
import { secret } from '@/features/mikrotik/testing/fixtures'

function mountTable(props: { rows: PppSecret[]; mode: 'unpaired' | 'paired' }) {
  return mount(SecretTable, {
    props: {
      selected: new Map<string, string>(),
      failures: {},
      canPair: true,
      canUnpair: true,
      ...props,
    },
    global: { plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]] },
  })
}

const suggestion = {
  account_id: 'acc1',
  account_name: 'Budi',
  account_phone: '0812',
  basis: 'phone',
  candidates: 1,
}

describe('SecretTable', () => {
  it('renders green, yellow and red rows; red checkbox is disabled', () => {
    const w = mountTable({
      mode: 'unpaired',
      rows: [
        secret({ id: 'g', name: 'g1', suggestion }),
        secret({
          id: 'y',
          name: 'y1',
          suggestion: { ...suggestion, account_id: '', basis: 'ambiguous', candidates: 2 },
        }),
        secret({ id: 'r', name: 'r1', needs_original_profile: true }),
      ],
    })
    const rows = w.findAll('tbody tr')
    const [g, y, r] = rows as [(typeof rows)[0], (typeof rows)[0], (typeof rows)[0]]
    expect(g.classes().join(' ')).toContain('bg-green')
    expect(y.classes().join(' ')).toContain('bg-yellow')
    expect(r.classes().join(' ')).toContain('bg-red')
    expect(r.get('input[type=checkbox]').attributes('disabled')).toBeDefined()
    expect(g.get('input[type=checkbox]').attributes('disabled')).toBeUndefined()
    expect(g.text()).toContain('Nomor HP')
    expect(y.text()).toContain('Nama ganda')
  })

  it('disables Lepas with a tooltip for isolated secrets in the paired tab', () => {
    const w = mountTable({
      mode: 'paired',
      rows: [
        secret({ id: 'i', name: 'iso', account_id: 'a1', isolation_state: 'isolated' }),
        secret({ id: 'n', name: 'norm', account_id: 'a2' }),
      ],
    })
    const buttons = w.findAll('button').filter((b) => b.text() === 'Lepas')
    expect(buttons).toHaveLength(2)
    expect(buttons[0]!.attributes('disabled')).toBeDefined()
    expect(buttons[0]!.attributes('title')).toBe(
      'Secret ini sedang terisolir. Lepas pasangan setelah pelanggan lunas atau dikecualikan.',
    )
    expect(buttons[1]!.attributes('disabled')).toBeUndefined()
  })

  it('shows account_name on the paired tab and a muted fallback when the account is gone', () => {
    const w = mountTable({
      mode: 'paired',
      rows: [
        secret({ id: 'a', account_id: 'uuid-1', account_name: 'Budi Santoso' }),
        secret({ id: 'b', account_id: 'uuid-2', account_name: '' }),
      ],
    })
    const cells = w.findAll('tbody tr')
    expect(cells[0]!.text()).toContain('Budi Santoso')
    expect(cells[0]!.text()).not.toContain('uuid-1')
    expect(cells[1]!.text()).toContain('Pelanggan tidak ditemukan')
    expect(cells[1]!.text()).not.toContain('uuid-2')
  })

  it('C1: label follows the selected account id, not a stale picked name', async () => {
    const row = secret({ id: 'r', name: 'r1', suggestion })
    const w = mountTable({ mode: 'unpaired', rows: [row] })
    await w.setProps({ selected: new Map([['r', 'accA']]), accountNames: { accA: 'Andi' } })
    expect(w.text()).toContain('Andi')
    expect(w.text()).not.toContain('Budi')
    await w.setProps({ selected: new Map([['r', 'acc1']]) })
    expect(w.text()).toContain('Budi')
    expect(w.text()).not.toContain('Andi')
    await w.setProps({ selected: new Map([['r', 'unknown']]) })
    expect(w.text()).not.toContain('Budi')
    expect(w.text()).toContain('Pelanggan dipilih')
  })
})
