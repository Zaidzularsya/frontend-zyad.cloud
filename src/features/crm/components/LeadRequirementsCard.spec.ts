import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import LeadRequirementsCard from './LeadRequirementsCard.vue'

const base = {
  id: 'l1',
  contact_name: 'Andi',
  status: 'qualified',
  score: 0,
  address: {},
  created_at: '',
  updated_at: '',
}

describe('LeadRequirementsCard', () => {
  it('shows saved requirements', () => {
    const w = mount(LeadRequirementsCard, {
      props: {
        lead: {
          ...base,
          requirement_summary: 'Internet 50 Mbps',
          budget_estimate: '15000000.00',
          target_date: '2026-11-30',
          decision_maker: 'Bu Rina',
        } as never,
      },
    })
    expect(w.text()).toContain('Internet 50 Mbps')
    expect(w.text()).toContain('15.000.000')
    expect(w.text()).toContain('Bu Rina')
    expect(w.text()).toContain('30 Nov 2026')
  })

  it('invites filling when empty and emits edit', async () => {
    const w = mount(LeadRequirementsCard, { props: { lead: base as never } })
    expect(w.text()).toContain('Belum diisi')
    await w.get('button').trigger('click')
    expect(w.emitted('edit')).toHaveLength(1)
  })

  it('hides the edit button when readonly', () => {
    const w = mount(LeadRequirementsCard, { props: { lead: base as never, readonly: true } })
    expect(w.find('button').exists()).toBe(false)
  })
})
