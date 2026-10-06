import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import type { WonChecklist } from '@/features/crm/sales-orders/api/sales-orders.api'
import WonChecklistCard from './WonChecklistCard.vue'

const checklist = (met: boolean[]): WonChecklist => ({
  sales_order_id: 'so1',
  so_number: 'SO-2026-0001',
  all_met: met.every(Boolean),
  conditions: met.map((m, i) => ({
    item_id: `i${i}`,
    description: `Item ${i}`,
    kind: 'prepaid_one_time',
    met: m,
    label: m ? 'Invoice INV-2026-0001 lunas' : 'Menunggu pembayaran INV-2026-0001',
  })),
})

describe('WonChecklistCard', () => {
  it('marks unmet conditions with ⏳ and shows the label', () => {
    const wrapper = mount(WonChecklistCard, { props: { checklists: [checklist([true, false])] } })
    const items = wrapper.findAll('li')
    expect(items[0]!.text()).toContain('✓')
    expect(items[1]!.text()).toContain('⏳')
    expect(items[1]!.text()).toContain('Menunggu pembayaran INV-2026-0001')
    expect(wrapper.text()).not.toContain('Semua syarat Won terpenuhi')
  })

  it('announces when every condition is met', () => {
    const wrapper = mount(WonChecklistCard, { props: { checklists: [checklist([true, true])] } })
    expect(wrapper.text()).toContain('Semua syarat Won terpenuhi')
    expect(wrapper.text()).not.toContain('⏳')
  })
})
