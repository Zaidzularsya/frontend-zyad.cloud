import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import CustomerIsolationBadge from '@/features/mikrotik/components/CustomerIsolationBadge.vue'
import type { CustomerStatus } from '@/features/mikrotik/types'

const st = (over: Partial<CustomerStatus>): CustomerStatus => ({
  account_id: 'a1',
  isolation_state: 'normal',
  exempt: false,
  secrets: 1,
  ...over,
})

describe('CustomerIsolationBadge', () => {
  it('shows a red Terisolir badge when isolated', () => {
    const w = mount(CustomerIsolationBadge, {
      props: { state: st({ isolation_state: 'isolated' }) },
    })
    expect(w.text()).toBe('Terisolir')
    expect(w.classes().join(' ')).toContain('red')
  })

  it('shows a muted Dikecualikan badge when exempt and not isolated', () => {
    const w = mount(CustomerIsolationBadge, { props: { state: st({ exempt: true }) } })
    expect(w.text()).toBe('Dikecualikan')
  })

  it('renders nothing for normal, none, or missing state', () => {
    expect(mount(CustomerIsolationBadge, { props: { state: st({}) } }).text()).toBe('')
    expect(
      mount(CustomerIsolationBadge, { props: { state: st({ isolation_state: 'none' }) } }).text(),
    ).toBe('')
    expect(mount(CustomerIsolationBadge).text()).toBe('')
  })
})
