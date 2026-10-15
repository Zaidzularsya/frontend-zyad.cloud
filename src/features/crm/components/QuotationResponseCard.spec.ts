import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import QuotationResponseCard from './QuotationResponseCard.vue'

const activity = (metadata: Record<string, unknown>) =>
  ({
    id: 'a1',
    type: 'quotation_response',
    subject: 'Customer meminta revisi penawaran QUO-1',
    metadata,
  }) as never

describe('QuotationResponseCard', () => {
  it('renders a revision request with category chips and the note as literal text', () => {
    const w = mount(QuotationResponseCard, {
      props: {
        activity: activity({
          action: 'revision_requested',
          categories: ['price', 'other'],
          note: '<script>alert(1)</script>',
          responder_name: 'Budi',
        }),
        highlight: 'revision',
        time: '1 jam lalu',
        timeTitle: '5 Okt 2026',
      },
    })
    expect(w.classes()).toContain('border-amber-400')
    expect(w.text()).toContain('Harga/diskon')
    expect(w.text()).toContain('Lainnya')
    expect(w.text()).toContain('<script>alert(1)</script>')
    expect(w.find('script').exists()).toBe(false)
  })

  it('renders an approval with the green treatment', () => {
    const w = mount(QuotationResponseCard, {
      props: {
        activity: activity({ action: 'approved', responder_name: 'Budi' }),
        highlight: 'approved',
        time: 'baru saja',
        timeTitle: '',
      },
    })
    expect(w.classes()).toContain('border-emerald-500')
    expect(w.find('li').exists()).toBe(false)
  })
})
