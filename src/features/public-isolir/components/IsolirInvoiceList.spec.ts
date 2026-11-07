import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import type { IsolirInvoice } from '../types'
import IsolirInvoiceList from './IsolirInvoiceList.vue'

const inv = (over: Partial<IsolirInvoice> = {}): IsolirInvoice => ({
  number: 'INV-1',
  due_date: '2026-10-12',
  balance: '1000.00',
  pay_url: 'https://pay.test/1',
  ...over,
})

describe('IsolirInvoiceList', () => {
  it('does not throw on a malformed due_date and falls back to the raw string', () => {
    const w = mount(IsolirInvoiceList, {
      props: { invoices: [inv({ due_date: 'bukan-tanggal' })] },
    })
    expect(w.text()).toContain('Jatuh tempo bukan-tanggal')
  })

  it.each(['javascript:alert(1)', 'data:text/html,x', '//evil.test/x', '/relative'])(
    'does not use %s as a link and shows the CS text',
    (payUrl) => {
      const w = mount(IsolirInvoiceList, { props: { invoices: [inv({ pay_url: payUrl })] } })
      expect(w.find('a').exists()).toBe(false)
      expect(w.text()).toContain('Hubungi kami untuk membayar tagihan ini.')
    },
  )

  it('uses http(s) pay_url as href', () => {
    const w = mount(IsolirInvoiceList, {
      props: { invoices: [inv({ pay_url: 'http://pay.test/1' })] },
    })
    expect(w.find('a').attributes('href')).toBe('http://pay.test/1')
  })
})
