import { describe, expect, it } from 'vitest'

import type { MenuGroup } from '@/config/menu'

import { filterMenuByEntitlement } from './menu-filter'

const icon = {} as MenuGroup['items'][number]['icon']

const groups = (): MenuGroup[] => [
  {
    label: 'CRM',
    items: [
      { label: 'Leads', route: 'crm-leads', icon, feature: 'crm.enabled' },
      { label: 'Produk', route: 'crm-products', icon },
    ],
  },
  {
    label: 'Billing',
    items: [{ label: 'Invoices', route: 'billing-invoices', icon, feature: 'receivable.enabled' }],
  },
  {
    label: 'Parent',
    items: [
      {
        label: 'Landing',
        icon,
        children: [
          { label: 'Domain', route: 'd', feature: 'domain.enabled' },
          { label: 'Pages', route: 'p', feature: 'landing.enabled' },
        ],
      },
    ],
  },
]

describe('filterMenuByEntitlement', () => {
  it('hides item whose feature is hidden', () => {
    const result = filterMenuByEntitlement(groups(), (k) => k === 'crm.enabled')
    expect(result[0]!.items.map((i) => i.label)).toEqual(['Produk'])
  })

  it('keeps item without feature', () => {
    const result = filterMenuByEntitlement(groups(), () => true)
    expect(result.flatMap((g) => g.items.map((i) => i.label))).toEqual(['Produk'])
  })

  it('drops group when all items hidden', () => {
    const result = filterMenuByEntitlement(groups(), (k) => k === 'receivable.enabled')
    expect(result.map((g) => g.label)).toEqual(['CRM', 'Parent'])
  })

  it('drops parent when all children hidden and keeps it when some remain', () => {
    const some = filterMenuByEntitlement(groups(), (k) => k === 'domain.enabled')
    expect(some[2]!.items[0]!.children?.map((c) => c.label)).toEqual(['Pages'])
    const none = filterMenuByEntitlement(
      groups(),
      (k) => k === 'domain.enabled' || k === 'landing.enabled',
    )
    expect(none.map((g) => g.label)).toEqual(['CRM', 'Billing'])
  })

  it('does not mutate the input', () => {
    const input = groups()
    const snapshot = JSON.stringify(input)
    filterMenuByEntitlement(input, () => true)
    expect(JSON.stringify(input)).toBe(snapshot)
  })

  describe('feature berupa beberapa key (salah satu cukup)', () => {
    const any = (): MenuGroup[] => [
      {
        label: 'Sales',
        items: [
          {
            label: 'Produk',
            route: 'crm-products',
            icon,
            feature: ['crm.enabled', 'receivable.enabled'],
          },
        ],
      },
    ]

    it('tampil bila salah satu fitur aktif', () => {
      // isHidden true = fitur tersembunyi/tidak berhak
      expect(filterMenuByEntitlement(any(), (k) => k !== 'receivable.enabled')).toHaveLength(1)
      expect(filterMenuByEntitlement(any(), (k) => k !== 'crm.enabled')).toHaveLength(1)
    })

    it('tersembunyi bila semua fitur tersembunyi', () => {
      expect(filterMenuByEntitlement(any(), () => true)).toEqual([])
    })

    it('array kosong dianggap tanpa gating', () => {
      const groups: MenuGroup[] = [
        { label: 'X', items: [{ label: 'Tanpa gate', route: 'x', icon, feature: [] }] },
      ]
      expect(filterMenuByEntitlement(groups, () => true)).toHaveLength(1)
    })
  })
})
