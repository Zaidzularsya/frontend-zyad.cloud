import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SubscriptionView } from '@/features/customer/api/self-serve.api'

const subscription = vi.fn()

vi.mock('@/features/customer/api/self-serve.api', () => ({
  selfServeApi: { subscription: () => subscription() },
}))

import DashboardPage from './DashboardPage.vue'

const base: SubscriptionView = {
  status: 'active',
  product: { name: 'Starter', sku: 'STARTER', frequency: 'monthly' },
  contract_number: 'CTR-1',
  next_invoice_date: '2026-10-29',
  overdue_days: 0,
  suspend_in_days: null,
  features: [],
  invoices: [
    {
      number: 'INV-1',
      status: 'paid',
      total: '333000.00',
      period_label: '',
      due_date: '2026-10-12',
      url: 'u1',
    },
    {
      number: 'INV-2',
      status: 'issued',
      total: '333000.00',
      period_label: '',
      due_date: '2026-11-12',
      url: 'u2',
    },
    {
      number: 'INV-3',
      status: 'overdue',
      total: '333000.00',
      period_label: '',
      due_date: '2026-09-12',
      url: 'u3',
    },
  ],
}

async function mountPage(view: SubscriptionView) {
  subscription.mockResolvedValue(view)
  const wrapper = mount(DashboardPage, {
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  })
  await flushPromises()
  return wrapper
}

describe('DashboardPage', () => {
  beforeEach(() => {
    subscription.mockReset()
  })

  it('menampilkan nama produk dan status dari langganan self-serve', async () => {
    const wrapper = await mountPage(base)
    expect(wrapper.text()).toContain('Starter')
    expect(wrapper.text()).toContain('Aktif')
  })

  it('status free tampil sebagai "Paket Free"', async () => {
    const wrapper = await mountPage({ ...base, status: 'free', product: null, invoices: [] })
    expect(wrapper.text()).toContain('Paket Free')
  })

  it('menghitung total invoice dan yang belum dibayar (terbit + lewat jatuh tempo)', async () => {
    const wrapper = await mountPage(base)
    expect(wrapper.get('[data-test="total-invoices"]').text()).toBe('3')
    expect(wrapper.get('[data-test="open-invoices"]').text()).toBe('2')
    expect(wrapper.text()).toContain('INV-2')
  })

  it('tetap tampil saat memuat langganan gagal', async () => {
    subscription.mockRejectedValue(new Error('boom'))
    const wrapper = mount(DashboardPage, {
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('Dashboard')
    expect(wrapper.text()).toContain('Gagal memuat')
  })
})
