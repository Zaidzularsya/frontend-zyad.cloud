import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SubscriptionView } from '@/features/customer/api/self-serve.api'

const subscription = vi.fn()
const bills = vi.fn()
const hiddenFeatures = new Set<string>()

vi.mock('@/features/customer/api/self-serve.api', () => ({
  selfServeApi: { subscription: () => subscription(), bills: () => bills() },
}))
vi.mock('@/features/entitlements/composables/useHiddenFeatures', () => ({
  useHiddenFeatures: () => (key: string) => hiddenFeatures.has(key),
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
    bills.mockReset()
    bills.mockResolvedValue({ seller: null, invoices: [] })
    hiddenFeatures.clear()
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

  it('tile CRM tampil bila crm.enabled tersedia dan hilang bila fitur itu tersembunyi', async () => {
    let wrapper = await mountPage(base)
    expect(wrapper.text()).toContain('CRM & Pipeline')

    hiddenFeatures.add('crm.enabled')
    wrapper = await mountPage(base)
    expect(wrapper.text()).not.toContain('CRM & Pipeline')
  })

  describe('tagihan dari penjual (pembeli/reseller tenant)', () => {
    const sellerBills = {
      seller: { name: 'Ethernet Net' },
      invoices: [
        {
          number: 'RCV-9',
          status: 'issued',
          total: '112000.00',
          period_label: '',
          due_date: '2026-11-12',
          url: 'https://x/i/9',
        },
        {
          number: 'RCV-8',
          status: 'paid',
          total: '112000.00',
          period_label: '',
          due_date: '2026-10-12',
          url: 'https://x/i/8',
        },
      ],
    }
    const freeView = { ...base, status: 'free' as const, product: null, invoices: [] }

    it('memakai tagihan penjual saat langganan platform tidak punya invoice', async () => {
      bills.mockResolvedValue(sellerBills)
      const wrapper = await mountPage(freeView)
      expect(wrapper.get('[data-test="total-invoices"]').text()).toBe('2')
      expect(wrapper.get('[data-test="open-invoices"]').text()).toBe('1')
      expect(wrapper.text()).toContain('RCV-9')
    })

    it('nama paket menunjuk penjual, bukan "Paket Free", saat tagihan berasal dari penjual', async () => {
      bills.mockResolvedValue(sellerBills)
      const wrapper = await mountPage(freeView)
      expect(wrapper.text()).toContain('Ethernet Net')
      expect(wrapper.text()).not.toContain('Paket Free')
    })

    it('langganan platform yang punya invoice tetap diutamakan', async () => {
      bills.mockResolvedValue(sellerBills)
      const wrapper = await mountPage(base)
      expect(wrapper.text()).toContain('INV-2')
      expect(wrapper.text()).not.toContain('RCV-9')
    })

    it('gagal memuat tagihan penjual tidak merusak dashboard', async () => {
      bills.mockRejectedValue(new Error('boom'))
      const wrapper = await mountPage({ ...base, status: 'free', product: null, invoices: [] })
      expect(wrapper.text()).toContain('Paket Free')
      expect(wrapper.text()).not.toContain('Gagal memuat')
    })
  })
})
