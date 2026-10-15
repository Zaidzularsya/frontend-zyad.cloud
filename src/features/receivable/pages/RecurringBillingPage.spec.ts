import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'

const { overview, getInvoice } = vi.hoisted(() => ({ overview: vi.fn(), getInvoice: vi.fn() }))
vi.mock('@/features/receivable/api/receivable.api', () => ({
  receivableApi: {
    overview: { get: overview },
    invoices: { get: getInvoice, send: vi.fn() },
  },
}))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => ({ can: () => true }) }))

import RecurringBillingPage from './RecurringBillingPage.vue'

const data = {
  active_contracts: 2,
  recurring_by_frequency: [
    { frequency: 'monthly', label: 'Bulanan', amount: '333000.00' },
    { frequency: 'annual', label: 'Tahunan', amount: '200000.00' },
  ],
  upcoming: [
    {
      contract_id: 'c1',
      contract_number: 'CTR-2026-0001',
      account_name: 'PT Maju',
      bill_on: '2026-10-29',
      period_start: '2026-11-05',
      period_end: '2026-12-04',
      amount: '333000.00',
      payment_timing: 'prepaid',
    },
  ],
  unpaid: { count: 3, total_balance: '999000.00', overdue_count: 1 },
  failed_sends: [
    {
      invoice_id: 'i1',
      invoice_number: 'INV-2026-0007',
      account_name: 'PT Maju',
      channel: 'whatsapp',
      error: 'Sesi WhatsApp terputus',
      sent_at: '2026-10-05T03:00:00Z',
    },
  ],
}

const invoice = {
  id: 'i1',
  invoice_number: 'INV-2026-0007',
  status: 'issued',
  account: { id: 'a1', name: 'Budi', email: 'budi@example.com', phone: '', contact_id: 'ct1' },
  grand_total: '333000.00',
  due_date: '2026-10-12',
  items: [],
}

async function mountPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/billing/recurring', component: RecurringBillingPage },
      { path: '/:rest(.*)*', component: { render: () => null } },
    ],
  })
  await router.push('/app/billing/recurring')
  const wrapper = mount(RecurringBillingPage, {
    global: {
      plugins: [router, [VueQueryPlugin, { queryClient: new QueryClient() }]],
      stubs: { teleport: true },
    },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

describe('RecurringBillingPage', () => {
  it('menampilkan kartu ringkasan', async () => {
    overview.mockResolvedValue(data)
    const text = (await mountPage()).text()
    expect(text).toContain('Kontrak aktif')
    expect(text).toContain('Bulanan')
    expect(text).toContain('Tahunan')
    expect(text).toContain('Belum lunas')
    expect(text).toContain('1 jatuh tempo')
    expect(text).toContain('Kiriman gagal')
  })

  it('menampilkan tabel tagihan 30 hari ke depan', async () => {
    overview.mockResolvedValue(data)
    const w = await mountPage()
    const text = w.text()
    // RouterLink di-stub global (tanpa slot): tautan diverifikasi lewat atribut `to`.
    expect(w.html()).toContain('to="/app/sales/contracts/c1"')
    expect(text).toContain('PT Maju')
    expect(text).toContain('Prabayar')
  })

  it('Retry membuka dialog kirim dengan kanal terisi', async () => {
    overview.mockResolvedValue(data)
    getInvoice.mockResolvedValue(invoice)
    const wrapper = await mountPage()
    expect(wrapper.html()).toContain('to="/app/billing/invoices/i1"')
    expect(wrapper.text()).toContain('Sesi WhatsApp terputus')

    await wrapper.get('button[data-retry="i1"]').trigger('click')
    await flushPromises()

    expect(getInvoice).toHaveBeenCalledWith('i1')
    const dialog = document.body.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    const checked = document.body.querySelector<HTMLInputElement>('input[type="radio"]:checked')
    expect(checked?.value).toBe('whatsapp')
  })

  it('menampilkan keadaan kosong tanpa kiriman gagal', async () => {
    overview.mockResolvedValue({ ...data, failed_sends: [], upcoming: [] })
    const text = (await mountPage()).text()
    expect(text).toContain('Tidak ada kiriman gagal')
    expect(text).toContain('Tidak ada tagihan dalam 30 hari ke depan')
  })
})
