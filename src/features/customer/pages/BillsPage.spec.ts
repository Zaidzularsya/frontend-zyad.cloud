import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { BillsView } from '@/features/customer/api/self-serve.api'

const bills = vi.fn()
vi.mock('@/features/customer/api/self-serve.api', () => ({
  selfServeApi: { bills: () => bills() },
}))

import BillsPage from './BillsPage.vue'

const invoice = (number: string, status: string, url = `https://x/i/${number}`) => ({
  number,
  status,
  total: '112000.00',
  period_label: '',
  due_date: '2026-11-12',
  url,
})

const view: BillsView = {
  seller: { name: 'Ethernet Net' },
  invoices: [invoice('RCV-1', 'paid'), invoice('RCV-2', 'issued'), invoice('RCV-3', 'void', '')],
}

async function mountPage() {
  const wrapper = mount(BillsPage, { attachTo: document.body })
  await flushPromises()
  return wrapper
}

describe('BillsPage', () => {
  beforeEach(() => bills.mockReset())

  it('menampilkan nama penjual dan seluruh tagihan', async () => {
    bills.mockResolvedValue(view)
    const wrapper = await mountPage()
    expect(wrapper.get('[data-testid="bills-seller"]').text()).toContain('Ethernet Net')
    expect(wrapper.findAll('[data-testid="bills-table"] tbody tr')).toHaveLength(3)
    expect(wrapper.text()).toContain('RCV-1')
    expect(wrapper.text()).toContain('Lunas')
  })

  it('tombol Bayar hanya untuk tagihan terbit/lewat jatuh tempo yang punya link', async () => {
    bills.mockResolvedValue({
      ...view,
      invoices: [...view.invoices, invoice('RCV-4', 'overdue'), invoice('RCV-5', 'issued', '')],
    })
    const wrapper = await mountPage()
    const links = wrapper.findAll('[data-testid="pay-link"]')
    expect(links.map((l) => l.attributes('href'))).toEqual([
      'https://x/i/RCV-2',
      'https://x/i/RCV-4',
    ])
  })

  it('tampilan kosong bila workspace tidak tertaut ke penjual', async () => {
    bills.mockResolvedValue({ seller: null, invoices: [] })
    const wrapper = await mountPage()
    expect(wrapper.find('[data-testid="bills-table"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="bills-empty"]').text()).toContain('Belum ada tagihan')
    expect(wrapper.find('[data-testid="bills-seller"]').exists()).toBe(false)
  })

  it('menampilkan galat dan bisa memuat ulang', async () => {
    bills.mockRejectedValueOnce(new Error('boom'))
    const wrapper = await mountPage()
    expect(wrapper.get('[data-testid="bills-error"]').text()).toContain('Gagal memuat tagihan')

    bills.mockResolvedValue(view)
    await wrapper.get('[data-testid="bills-reload"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="bills-error"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="bills-table"] tbody tr')).toHaveLength(3)
  })
})
