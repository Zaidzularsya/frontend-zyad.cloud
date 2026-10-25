import { describe, expect, it } from 'vitest'

import { customerMenuGroups, platformMenuGroups } from '@/config/menu'

const flat = (groups: typeof platformMenuGroups) =>
  groups.flatMap((g) => g.items.flatMap((i) => [i, ...(i.children ?? [])]))

describe('settlement menu', () => {
  it('admin entry lives only in platform menu, guarded by settlement.manage', () => {
    const item = flat(platformMenuGroups).find((i) => i.route === 'platform-settlements')
    expect(item?.permission).toBe('settlement.manage')
    expect(flat(customerMenuGroups).some((i) => i.route === 'platform-settlements')).toBe(false)
  })
  it('my balance lives only in customer Billing group, guarded by settlement.read', () => {
    const billing = customerMenuGroups.find((g) => g.label === 'Billing')!
    const item = billing.items.find((i) => i.route === 'billing-settlement')
    expect(item?.permission).toBe('settlement.read')
    expect(flat(platformMenuGroups).some((i) => i.route === 'billing-settlement')).toBe(false)
  })
})
