import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const list = vi.hoisted(() => vi.fn())
vi.mock('../api/activation.api', () => ({ activationApi: { list } }))
const success = vi.fn()
const error = vi.fn()
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ success, error }) }))

import ActivationInvoicesPage from './ActivationInvoicesPage.vue'
import type {
  ActivationInvoiceRow,
  ActivationInvoicesPage as Page,
} from '../utils/activation-invoices'

const row = (over: Partial<ActivationInvoiceRow> = {}): ActivationInvoiceRow => ({
  id: 'a1',
  page_id: 'p1',
  page_title: 'Undangan Budi',
  page_slug: 'undangan-budi',
  page_status: 'draft',
  page_active_until: null,
  invoice_id: 'inv-1',
  buyer_name: 'Budi',
  buyer_contact: '081234567890',
  buyer_email: null,
  price: '150000.00',
  duration_value: 1,
  duration_unit: 'month',
  invoice_due_at: '2026-10-26T05:00:00Z',
  status: 'open',
  state: 'awaiting_payment',
  paid_at: null,
  created_at: '2026-10-26T04:00:00Z',
  payment_url: 'https://zyad.cloud/i/PAY',
  ...over,
})

const pageOf = (items: ActivationInvoiceRow[], totalPages = 1, page = 1): Page => ({
  items,
  meta: { total: items.length, page, per_page: 20, total_pages: totalPages },
})

const RenewStub = {
  name: 'RenewActivationDialog',
  props: ['open', 'row'],
  emits: ['close', 'renewed'],
  template: '<div data-testid="renew-dialog" :data-open="open" :data-row="row?.id" />',
}

async function mountPage() {
  const w = mount(ActivationInvoicesPage, {
    global: {
      plugins: [
        [
          VueQueryPlugin,
          { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        ],
      ],
      stubs: { RenewActivationDialog: RenewStub },
    },
    attachTo: document.body,
  })
  await flushPromises()
  return w
}

beforeEach(() => {
  list.mockReset()
  success.mockReset()
  error.mockReset()
})

describe('ActivationInvoicesPage', () => {
  it('menampilkan invoice dengan pelanggan, halaman, harga, dan status yang relevan', async () => {
    list.mockResolvedValue(
      pageOf([
        row(),
        row({ id: 'a2', state: 'expired', buyer_name: 'Sari' }),
        row({ id: 'a3', state: 'paid', status: 'paid', buyer_name: 'Dewi' }),
      ]),
    )
    const w = await mountPage()
    const rows = w.findAll('[data-testid="invoice-row"]')
    expect(rows).toHaveLength(3)
    expect(rows[0]!.text()).toContain('Budi')
    expect(rows[0]!.text()).toContain('Undangan Budi')
    expect(rows[0]!.text()).toContain('Menunggu pembayaran')
    expect(rows[0]!.text()).toMatch(/150\.000/)
    expect(rows[1]!.text()).toContain('Preview kedaluwarsa')
    expect(rows[2]!.text()).toContain('Lunas')
  })

  it('filter status memuat ulang dengan parameter yang sesuai', async () => {
    list.mockResolvedValue(pageOf([row()]))
    const w = await mountPage()
    expect(list).toHaveBeenLastCalledWith({ page: 1, per_page: 20 })

    await w.get('[data-testid="filter-open"]').trigger('click')
    await flushPromises()
    expect(list).toHaveBeenLastCalledWith({ status: 'open', page: 1, per_page: 20 })

    await w.get('[data-testid="filter-paid"]').trigger('click')
    await flushPromises()
    expect(list).toHaveBeenLastCalledWith({ status: 'paid', page: 1, per_page: 20 })

    await w.get('[data-testid="filter-all"]').trigger('click')
    await flushPromises()
    expect(list).toHaveBeenLastCalledWith({ page: 1, per_page: 20 })
  })

  it('"Salin link bayar" menyalin link pembayaran invoice itu', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    list.mockResolvedValue(pageOf([row()]))
    const w = await mountPage()
    await w.get('[data-testid="copy-payment-link"]').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith('https://zyad.cloud/i/PAY')
    expect(success).toHaveBeenCalled()
  })

  it('"Kirim tagihan" membuka WhatsApp ke nomor pelanggan dengan link pembayaran', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    list.mockResolvedValue(pageOf([row()]))
    const w = await mountPage()
    await w.get('[data-testid="send-payment-link"]').trigger('click')
    const url = open.mock.calls[0]?.[0] as string
    expect(url.startsWith('https://wa.me/6281234567890?text=')).toBe(true)
    expect(decodeURIComponent(url.split('?text=')[1] ?? '')).toContain('https://zyad.cloud/i/PAY')
    open.mockRestore()
  })

  it('invoice dibatalkan tidak punya aksi link bayar maupun perbarui', async () => {
    list.mockResolvedValue(pageOf([row({ state: 'void', status: 'void', payment_url: '' })]))
    const w = await mountPage()
    expect(w.find('[data-testid="copy-payment-link"]').exists()).toBe(false)
    expect(w.find('[data-testid="send-payment-link"]').exists()).toBe(false)
    expect(w.find('[data-testid="renew-link"]').exists()).toBe(false)
  })

  it('"Perbarui link" hanya untuk invoice terbuka dan membuka dialog dengan baris itu', async () => {
    list.mockResolvedValue(
      pageOf([row({ id: 'a1' }), row({ id: 'a2', state: 'paid', status: 'paid' })]),
    )
    const w = await mountPage()
    const buttons = w.findAll('[data-testid="renew-link"]')
    expect(buttons).toHaveLength(1)
    await buttons[0]!.trigger('click')
    const dialog = w.get('[data-testid="renew-dialog"]')
    expect(dialog.attributes('data-open')).toBe('true')
    expect(dialog.attributes('data-row')).toBe('a1')
  })

  it('setelah link diperbarui, daftar dimuat ulang', async () => {
    list.mockResolvedValue(pageOf([row()]))
    const w = await mountPage()
    const before = list.mock.calls.length
    w.findComponent(RenewStub).vm.$emit('renewed')
    await flushPromises()
    expect(list.mock.calls.length).toBeGreaterThan(before)
  })

  it('paginasi memuat halaman berikutnya', async () => {
    list.mockResolvedValue(pageOf([row()], 2, 1))
    const w = await mountPage()
    expect(w.get('[data-testid="page-prev"]').attributes('disabled')).toBeDefined()
    await w.get('[data-testid="page-next"]').trigger('click')
    await flushPromises()
    expect(list).toHaveBeenLastCalledWith({ page: 2, per_page: 20 })
  })

  it('kosong dan galat punya tampilan sendiri', async () => {
    list.mockResolvedValueOnce(pageOf([]))
    let w = await mountPage()
    expect(w.get('[data-testid="invoices-empty"]').text()).toContain('Belum ada invoice')

    list.mockReset()
    list.mockRejectedValue(new Error('boom'))
    w = await mountPage()
    expect(w.get('[data-testid="invoices-error"]').text()).toContain('Gagal memuat')
  })
})
