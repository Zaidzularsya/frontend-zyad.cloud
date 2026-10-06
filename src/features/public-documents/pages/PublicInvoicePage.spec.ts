import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { PublicInvoice } from '../api/public-invoice.api'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('../api/public-invoice.api', () => ({
  publicInvoiceApi: {
    get,
    pdfUrl: (t: string) => `/api/v1/public/invoices/${t}/pdf`,
  },
}))

import PublicInvoicePage from './PublicInvoicePage.vue'

function invoice(over: Partial<PublicInvoice> = {}): PublicInvoice {
  return {
    tenant_name: 'PT Zyad',
    invoice_number: 'INV-2026-0001',
    status: 'issued',
    state: 'open',
    issue_date: '2026-10-05',
    due_date: '2026-10-12',
    period_start: '2026-10-01',
    period_end: '2026-10-31',
    currency: 'IDR',
    grand_total: '333000.00',
    amount_paid: '100000.00',
    balance: '233000.00',
    can_pay: false,
    items: [
      {
        description: '<script>alert(1)</script> Internet 50 Mbps',
        quantity: '1.00',
        unit: 'bulan',
        unit_price: '300000.00',
        line_total: '300000.00',
        charge_type: 'recurring',
        billing_frequency: 'monthly',
        payment_timing: 'prepaid',
        period_start: '2026-10-01',
        period_end: '2026-10-31',
      },
    ],
    ...over,
  }
}

async function mountPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/i/:token', component: PublicInvoicePage }],
  })
  await router.push('/i/tok123')
  const wrapper = mount(PublicInvoicePage, {
    attachTo: document.body,
    global: {
      plugins: [
        router,
        [
          VueQueryPlugin,
          { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        ],
      ],
    },
  })
  await flushPromises()
  return wrapper
}

const buttons = (w: Awaited<ReturnType<typeof mountPage>>) =>
  w.findAll('button').map((b) => b.text())

describe('PublicInvoicePage', () => {
  beforeEach(() => {
    get.mockReset()
    document.body.innerHTML = ''
    document.head.querySelectorAll('meta[name="robots"]').forEach((m) => m.remove())
  })

  it('open invoice: amount, due date and balance, without a pay button', async () => {
    get.mockResolvedValue(invoice())
    const w = await mountPage()
    expect(get).toHaveBeenCalledWith('tok123')
    const text = w.text()
    expect(text).toContain('PT Zyad')
    expect(text).toContain('INV-2026-0001')
    expect(text).toContain('Rp 333.000')
    expect(text).toContain('Jatuh tempo')
    expect(text).toContain('12 Oktober 2026')
    expect(text).toContain('Sisa tagihan')
    expect(text).toContain('Rp 233.000')
    expect(text).toContain('1 Oktober 2026')
    expect(buttons(w).some((b) => b.includes('Bayar'))).toBe(false)
    expect(text).not.toContain('Lunas')
    expect(text).not.toContain('dibatalkan')
  })

  it('paid invoice shows the Lunas badge and no balance due', async () => {
    get.mockResolvedValue(
      invoice({ status: 'paid', state: 'paid', amount_paid: '333000.00', balance: '0.00' }),
    )
    const w = await mountPage()
    expect(w.text()).toContain('Lunas')
    expect(w.text()).not.toContain('Sisa tagihan')
    expect(buttons(w).some((b) => b.includes('Bayar'))).toBe(false)
  })

  it('void invoice says it was cancelled', async () => {
    get.mockResolvedValue(invoice({ status: 'void', state: 'void' }))
    const w = await mountPage()
    expect(w.text()).toContain('Invoice ini dibatalkan')
    expect(w.text()).not.toContain('Sisa tagihan')
    expect(buttons(w).some((b) => b.includes('Bayar'))).toBe(false)
  })

  it('unknown or expired link shows the generic message', async () => {
    get.mockRejectedValue({ response: { status: 404 } })
    const w = await mountPage()
    expect(w.text()).toContain('Link tidak valid atau sudah tidak berlaku.')
    expect(w.text()).not.toContain('INV-')
  })

  it('shows the pay slot only when the backend allows paying', async () => {
    get.mockResolvedValue(invoice({ can_pay: true }))
    const w = await mountPage()
    expect(buttons(w)).toContain('Bayar sekarang')
  })

  it('overdue invoices are still payable-state open and flagged as overdue by date', async () => {
    get.mockResolvedValue(invoice({ status: 'overdue', state: 'open' }))
    const w = await mountPage()
    expect(w.text()).toContain('Jatuh tempo')
    expect(w.text()).toContain('Sudah lewat jatuh tempo')
  })

  it('renders item text literally instead of interpreting HTML', async () => {
    get.mockResolvedValue(invoice())
    const w = await mountPage()
    expect(w.text()).toContain('<script>alert(1)</script> Internet 50 Mbps')
    expect(w.find('script').exists()).toBe(false)
  })

  it('links the PDF same-origin and marks the page noindex', async () => {
    get.mockResolvedValue(invoice())
    const w = await mountPage()
    expect(w.find('a[href="/api/v1/public/invoices/tok123/pdf"]').exists()).toBe(true)
    expect(w.find('object').attributes('data')).toBe('/api/v1/public/invoices/tok123/pdf')
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex',
    )
    w.unmount()
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull()
  })
})
