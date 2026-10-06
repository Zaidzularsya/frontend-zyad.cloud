import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'

const { get, sends, payments } = vi.hoisted(() => ({
  get: vi.fn(),
  sends: vi.fn(),
  payments: vi.fn(),
}))
vi.mock('@/features/receivable/api/receivable.api', () => ({
  receivableApi: {
    invoices: {
      get,
      sends,
      payments,
      pdf: vi.fn().mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' })),
      link: vi.fn(),
      send: vi.fn(),
      issue: vi.fn(),
      void: vi.fn(),
      recordPayment: vi.fn(),
    },
  },
}))
vi.mock('@/features/email/api/email.api', () => ({
  emailApi: { listMailboxes: vi.fn().mockResolvedValue([]) },
}))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => ({ can: () => true }) }))

import InvoiceDetailPage from './InvoiceDetailPage.vue'

const base = {
  id: 'i1',
  invoice_number: null,
  status: 'draft',
  account: {
    id: 'a1',
    name: 'Budi',
    company_name: 'PT Maju',
    email: 'budi@example.com',
    phone: '',
    address: '',
    contact_id: null,
  },
  currency: 'IDR',
  subtotal: '333000.00',
  discount_total: '0.00',
  tax_total: '0.00',
  grand_total: '333000.00',
  amount_paid: '0.00',
  balance: '333000.00',
  channels: ['email'],
  items: [
    {
      id: 'it1',
      description: 'Internet 50 Mbps',
      quantity: '1.00',
      unit: 'bulan',
      unit_price: '333000.00',
      discount_percent: null,
      tax_percent: '0.00',
      tax_amount: '0.00',
      line_total: '333000.00',
      product_id: null,
      sku: '',
      charge_type: 'one_time',
      billing_frequency: null,
      payment_timing: 'prepaid',
      period_start: null,
      period_end: null,
      position: 0,
    },
  ],
  last_send: null,
  created_at: '2026-10-05T03:00:00Z',
}

async function open(invoice: Record<string, unknown>, sendList: unknown[] = []) {
  get.mockResolvedValue({ ...base, ...invoice })
  sends.mockResolvedValue(sendList)
  payments.mockResolvedValue([])
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/app/billing/invoices/:id',
        name: 'billing-invoice-detail',
        component: InvoiceDetailPage,
      },
      {
        path: '/app/billing/invoices/:id/edit',
        name: 'billing-invoice-edit',
        component: { template: '<div/>' },
      },
      {
        path: '/app/billing/invoices',
        name: 'billing-invoices',
        component: { template: '<div/>' },
      },
    ],
  })
  await router.push('/app/billing/invoices/i1')
  const w = mount(InvoiceDetailPage, {
    global: {
      plugins: [router, [VueQueryPlugin, { queryClient: new QueryClient() }]],
      stubs: { teleport: true },
    },
  })
  await flushPromises()
  return w
}

const labels = (w: ReturnType<typeof mount>) => w.findAll('button, a').map((b) => b.text())

describe('InvoiceDetailPage', () => {
  it('draft: offers Terbitkan and Edit only', async () => {
    const w = await open({ status: 'draft' })
    const l = labels(w)
    expect(l).toContain('Terbitkan')
    expect(l).toContain('Edit')
    expect(l.some((t) => t.startsWith('Kirim'))).toBe(false)
    expect(l).not.toContain('Catat pembayaran')
    expect(w.text()).toContain('Draft')
    expect(w.text()).toContain('Internet 50 Mbps')
  })

  it('issued: offers Kirim…, Catat pembayaran, Salin link and Batalkan', async () => {
    const w = await open({
      status: 'issued',
      invoice_number: 'INV-2026-0001',
      due_date: '2026-10-12',
    })
    const l = labels(w)
    expect(l).toContain('Kirim…')
    expect(l).toContain('Catat pembayaran')
    expect(l).toContain('Salin link')
    expect(l).toContain('Batalkan')
    expect(l).not.toContain('Terbitkan')
    expect(l).not.toContain('Edit')
    expect(w.text()).toContain('INV-2026-0001')
    expect(w.text()).toContain('Terbit')
  })

  it('paid: no payment, void or edit actions; can still send the receipt', async () => {
    const w = await open({
      status: 'paid',
      invoice_number: 'INV-1',
      amount_paid: '333000.00',
      balance: '0.00',
    })
    const l = labels(w)
    expect(l).toContain('Kirim…')
    expect(l).not.toContain('Catat pembayaran')
    expect(l).not.toContain('Batalkan')
    expect(w.text()).toContain('Lunas')
  })

  it('an invoice with payments cannot be voided', async () => {
    const w = await open({
      status: 'issued',
      invoice_number: 'INV-1',
      amount_paid: '100000.00',
      balance: '233000.00',
    })
    expect(labels(w)).not.toContain('Batalkan')
    expect(labels(w)).toContain('Catat pembayaran')
    expect(w.text()).toContain('Rp 233.000')
  })

  it('void: read-only with the cancellation reason', async () => {
    const w = await open({ status: 'void', invoice_number: 'INV-1', void_reason: 'Salah input' })
    const l = labels(w)
    expect(l).not.toContain('Catat pembayaran')
    expect(l.some((t) => t.startsWith('Kirim'))).toBe(false)
    expect(w.text()).toContain('Dibatalkan')
    expect(w.text()).toContain('Salah input')
  })

  it('a failed delivery shows its reason and a Retry button', async () => {
    const w = await open({ status: 'issued', invoice_number: 'INV-1' }, [
      {
        id: 's1',
        invoice_id: 'i1',
        channel: 'email',
        recipient: 'budi@example.com',
        status: 'failed',
        error: 'Belum ada pengirim. Atur PIC atau pengirim default di Pengaturan Penagihan.',
        trigger: 'auto',
        sent_by: null,
        sent_by_name: '',
        sent_at: '2026-10-05T03:00:00Z',
      },
    ])
    expect(w.text()).toContain('Belum ada pengirim.')
    expect(labels(w)).toContain('Retry')
  })
})
