import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { PublicInvoice } from '../api/public-invoice.api'

const { get, checkout, status, provisioning, redirectTo } = vi.hoisted(() => ({
  get: vi.fn(),
  provisioning: vi.fn(),
  checkout: vi.fn(),
  status: vi.fn(),
  redirectTo: vi.fn(),
}))
vi.mock('../utils/redirect', () => ({ redirectTo }))
vi.mock('../api/public-invoice.api', () => ({
  publicInvoiceApi: {
    get,
    checkout,
    status,
    provisioning,
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

async function mountPage(query = '') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/i/:token', component: PublicInvoicePage }],
  })
  await router.push(`/i/tok123${query}`)
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
    checkout.mockReset()
    status.mockReset()
    provisioning.mockReset()
    provisioning.mockResolvedValue({ applicable: false })
    redirectTo.mockReset()
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

  describe('pembayaran online', () => {
    it('klik Bayar sekarang memanggil checkout sekali lalu mengalihkan ke DOKU', async () => {
      get.mockResolvedValue(invoice({ can_pay: true }))
      let resolve!: (v: { payment_url: string; expires_at: string }) => void
      checkout.mockReturnValue(new Promise((r) => (resolve = r)))
      const w = await mountPage()
      const btn = () => w.findAll('button').find((b) => b.text().includes('Bayar'))!
      await btn().trigger('click')
      await btn().trigger('click')
      expect(checkout).toHaveBeenCalledTimes(1)
      expect(checkout).toHaveBeenCalledWith('tok123')
      expect(btn().attributes('disabled')).toBeDefined()
      resolve({ payment_url: 'https://doku.test/pay', expires_at: '2026-10-05T04:00:00Z' })
      await flushPromises()
      expect(redirectTo).toHaveBeenCalledWith('https://doku.test/pay')
    })

    it('403 menyembunyikan tombol dan menampilkan pesan server', async () => {
      get.mockResolvedValue(invoice({ can_pay: true }))
      checkout.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Pembayaran online belum tersedia untuk invoice ini.' },
        },
      })
      const w = await mountPage()
      await w
        .findAll('button')
        .find((b) => b.text().includes('Bayar'))!
        .trigger('click')
      await flushPromises()
      expect(buttons(w).some((b) => b.includes('Bayar'))).toBe(false)
      expect(w.text()).toContain('Pembayaran online belum tersedia untuk invoice ini.')
      expect(redirectTo).not.toHaveBeenCalled()
    })

    describe('kembali dari DOKU (?paid=1)', () => {
      beforeEach(() => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
      })
      afterEach(() => {
        vi.useRealTimers()
      })

      it('memverifikasi lewat polling lalu menampilkan pembayaran diterima', async () => {
        get.mockResolvedValueOnce(invoice({ can_pay: true }))
        status.mockResolvedValueOnce({ status: 'issued' }).mockResolvedValue({ status: 'paid' })
        const w = await mountPage('?paid=1')
        expect(w.text()).toContain('Memverifikasi pembayaran…')
        get.mockResolvedValue(
          invoice({ status: 'paid', state: 'paid', amount_paid: '333000.00', balance: '0.00' }),
        )
        await vi.advanceTimersByTimeAsync(5000)
        await flushPromises()
        expect(status).toHaveBeenCalledWith('tok123')
        expect(w.text()).toContain('Pembayaran diterima. Terima kasih!')
        expect(w.text()).not.toContain('Memverifikasi pembayaran…')
        const calls = status.mock.calls.length
        await vi.advanceTimersByTimeAsync(30000)
        expect(status.mock.calls.length).toBe(calls)
      })

      it('berhenti setelah 12 kali dan menampilkan pesan sedang diproses', async () => {
        get.mockResolvedValue(invoice({ can_pay: true }))
        status.mockResolvedValue({ status: 'issued' })
        const w = await mountPage('?paid=1')
        await vi.advanceTimersByTimeAsync(5000 * 15)
        await flushPromises()
        expect(status).toHaveBeenCalledTimes(12)
        expect(w.text()).toContain(
          'Pembayaran sedang diproses. Halaman akan diperbarui saat konfirmasi diterima.',
        )
      })

      it('tanpa ?paid=1 tidak ada polling', async () => {
        get.mockResolvedValue(invoice({ can_pay: true }))
        await mountPage()
        await vi.advanceTimersByTimeAsync(60000)
        expect(status).not.toHaveBeenCalled()
      })
    })
  })

  describe('tahap pemulihan (provisioning)', () => {
    const paid = () => invoice({ status: 'paid', state: 'paid', balance: '0.00' })

    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('shows no block when not applicable', async () => {
      get.mockResolvedValue(paid())
      const w = await mountPage()
      expect(provisioning).toHaveBeenCalledWith('tok123')
      expect(w.find('[data-testid="provisioning-status"]').exists()).toBe(false)
      await vi.advanceTimersByTimeAsync(60000)
      expect(provisioning).toHaveBeenCalledTimes(1)
    })

    it('shows restoring text then switches to active and stops polling', async () => {
      get.mockResolvedValue(paid())
      provisioning
        .mockResolvedValueOnce({ applicable: true, stage: 'received' })
        .mockResolvedValueOnce({ applicable: true, stage: 'restoring' })
        .mockResolvedValue({ applicable: true, stage: 'active' })
      const w = await mountPage()
      expect(w.text()).toContain(
        'Pembayaran diterima. Kami sedang menyiapkan pengaktifan internet Anda.',
      )
      await vi.advanceTimersByTimeAsync(5000)
      expect(w.text()).toContain('Sedang mengaktifkan internet. Biasanya 1–2 menit.')
      await vi.advanceTimersByTimeAsync(5000)
      expect(w.text()).toContain('Internet Anda sudah aktif.')
      expect(buttons(w)).toContain('Muat ulang')
      const calls = provisioning.mock.calls.length
      await vi.advanceTimersByTimeAsync(60000)
      expect(provisioning).toHaveBeenCalledTimes(calls)
    })

    it('needs_help stops polling and shows help text', async () => {
      get.mockResolvedValue(paid())
      provisioning.mockResolvedValue({ applicable: true, stage: 'needs_help' })
      const w = await mountPage()
      expect(w.text()).toContain(
        'Pembayaran sudah kami terima, tetapi aktivasi tertunda. Hubungi kami agar segera dibantu.',
      )
      await vi.advanceTimersByTimeAsync(60000)
      expect(provisioning).toHaveBeenCalledTimes(1)
    })

    it('needs_help with contact shows tel, wa.me and mailto links', async () => {
      get.mockResolvedValue(paid())
      provisioning.mockResolvedValue({
        applicable: true,
        stage: 'needs_help',
        contact: { name: 'ISP Maju', phone: '0812-3456-7890', email: 'cs@isp.id' },
      })
      const w = await mountPage()
      const block = w.find('[data-testid="provisioning-status"]')
      expect(block.find('a[href="tel:081234567890"]').exists()).toBe(true)
      expect(block.find('a[href="https://wa.me/6281234567890"]').exists()).toBe(true)
      expect(block.find('a[href="mailto:cs@isp.id"]').exists()).toBe(true)
      expect(block.text()).toContain('ISP Maju')
    })

    it('needs_help without contact shows plain text only', async () => {
      get.mockResolvedValue(paid())
      provisioning.mockResolvedValue({ applicable: true, stage: 'needs_help' })
      const w = await mountPage()
      const block = w.find('[data-testid="provisioning-status"]')
      expect(block.text()).toContain('Hubungi kami agar segera dibantu.')
      expect(block.find('a').exists()).toBe(false)
    })

    it('needs_help with partial contact hides missing channels', async () => {
      get.mockResolvedValue(paid())
      provisioning.mockResolvedValue({
        applicable: true,
        stage: 'needs_help',
        contact: { email: 'cs@isp.id' },
      })
      const w = await mountPage()
      const block = w.find('[data-testid="provisioning-status"]')
      expect(block.findAll('a')).toHaveLength(1)
      expect(block.find('a[href="mailto:cs@isp.id"]').exists()).toBe(true)
    })

    it('status region is present before any answer arrives', async () => {
      get.mockResolvedValue(paid())
      provisioning.mockReturnValue(new Promise(() => {}))
      const w = await mountPage()
      const region = w.find('[data-testid="provisioning-region"]')
      expect(region.exists()).toBe(true)
      expect(region.attributes('role')).toBe('status')
      expect(region.text()).toBe('')
    })

    it('Muat ulang reloads the page', async () => {
      const reload = vi.fn()
      vi.stubGlobal('location', { ...window.location, reload })
      try {
        get.mockResolvedValue(paid())
        provisioning.mockResolvedValue({ applicable: true, stage: 'active' })
        const w = await mountPage()
        await w
          .findAll('button')
          .find((b) => b.text() === 'Muat ulang')!
          .trigger('click')
        expect(reload).toHaveBeenCalledTimes(1)
      } finally {
        vi.unstubAllGlobals()
      }
    })

    it('other_invoices stops polling', async () => {
      get.mockResolvedValue(paid())
      provisioning.mockResolvedValue({ applicable: true, stage: 'other_invoices' })
      const w = await mountPage()
      expect(w.text()).toContain(
        'Pembayaran diterima. Internet aktif setelah semua tagihan yang menunggak lunas.',
      )
      await vi.advanceTimersByTimeAsync(60000)
      expect(provisioning).toHaveBeenCalledTimes(1)
    })

    it('no provisioning call for open invoice', async () => {
      get.mockResolvedValue(invoice())
      await mountPage()
      await vi.advanceTimersByTimeAsync(60000)
      expect(provisioning).not.toHaveBeenCalled()
    })

    it('stops polling on unmount', async () => {
      get.mockResolvedValue(paid())
      provisioning.mockResolvedValue({ applicable: true, stage: 'restoring' })
      const w = await mountPage()
      await vi.advanceTimersByTimeAsync(5000)
      const calls = provisioning.mock.calls.length
      w.unmount()
      await vi.advanceTimersByTimeAsync(60000)
      expect(provisioning).toHaveBeenCalledTimes(calls)
    })

    it('stops polling when it becomes not applicable', async () => {
      get.mockResolvedValue(paid())
      provisioning
        .mockResolvedValueOnce({ applicable: true, stage: 'restoring' })
        .mockResolvedValue({ applicable: false })
      const w = await mountPage()
      await vi.advanceTimersByTimeAsync(5000)
      expect(w.find('[data-testid="provisioning-status"]').exists()).toBe(false)
      await vi.advanceTimersByTimeAsync(60000)
      expect(provisioning).toHaveBeenCalledTimes(2)
    })

    it('a request error hides the block and stops polling', async () => {
      get.mockResolvedValue(paid())
      provisioning
        .mockResolvedValueOnce({ applicable: true, stage: 'restoring' })
        .mockRejectedValue({ response: { status: 429 } })
      const w = await mountPage()
      expect(w.text()).toContain('Sedang mengaktifkan internet')
      await vi.advanceTimersByTimeAsync(5000)
      expect(w.find('[data-testid="provisioning-status"]').exists()).toBe(false)
      await vi.advanceTimersByTimeAsync(60000)
      expect(provisioning).toHaveBeenCalledTimes(2)
    })

    it('gives up after 60 attempts', async () => {
      get.mockResolvedValue(paid())
      provisioning.mockResolvedValue({ applicable: true, stage: 'restoring' })
      await mountPage()
      await vi.advanceTimersByTimeAsync(10 * 60000)
      expect(provisioning).toHaveBeenCalledTimes(60)
    })
  })
})
