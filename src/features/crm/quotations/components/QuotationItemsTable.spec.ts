import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import { blankLine, type EditorLine } from '@/features/crm/quotations/utils/quotation-editor'

import QuotationItemsTable from './QuotationItemsTable.vue'

const totals = {
  lines: [],
  subtotal: '0.00',
  discountTotal: '0.00',
  taxTotal: '0.00',
  grandTotal: '0.00',
} as never

function line(over: Partial<EditorLine>): EditorLine {
  return { ...blankLine(), description: 'Freelancer', unitPrice: '100', ...over }
}

function mountTable(lines: EditorLine[], readonly = false) {
  return mount(QuotationItemsTable, { props: { lines, totals, readonly } })
}

describe('QuotationItemsTable features', () => {
  it('lists visible feature labels under the description and skips empty ones', () => {
    for (const readonly of [true, false]) {
      const w = mountTable(
        [
          line({
            features: [
              { feature_key: 'crm', value: true, label: 'CRM' },
              { feature_key: 'wa', value: false, label: '' },
              { feature_key: 'users', value: 5, label: 'Hingga 5 user' },
            ],
          }),
        ],
        readonly,
      )
      const items = w.findAll('[data-testid="line-features"] li').map((li) => li.text())
      expect(items).toEqual(['CRM', 'Hingga 5 user'])
    }
  })

  it('renders no feature list for lines without features', () => {
    const w = mountTable([
      line({ features: [] }),
      line({ features: [{ feature_key: 'wa', value: false, label: '' }] }),
    ])
    expect(w.find('[data-testid="line-features"]').exists()).toBe(false)
  })
})
