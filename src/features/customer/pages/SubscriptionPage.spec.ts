import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SubscriptionView } from '@/features/customer/api/self-serve.api'

const push = vi.fn()
const subscription = vi.fn()
const listListings = vi.fn()

vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/features/customer/api/self-serve.api', () => ({
  selfServeApi: { subscription: () => subscription() },
}))
vi.mock('@/features/public/api/public-catalog.api', () => ({
  publicCatalogApi: { listListings: () => listListings() },
}))

import SubscriptionPage from './SubscriptionPage.vue'

const base: SubscriptionView = {
  status: 'active',
  product: { name: 'Starter', sku: 'STARTER', frequency: 'monthly' },
  contract_number: 'CTR-1',
  next_invoice_date: '2026-10-29',
  overdue_days: 0,
  suspend_in_days: null,
  features: [{ feature_key: 'user.max', value: 5, label: '5 pengguna' }],
  invoices: [
    {
      number: 'INV-1',
      status: 'paid',
      total: '333000.00',
      period_label: '',
      due_date: '2026-10-12',
      url: 'https://x/i/1',
    },
    {
      number: 'INV-2',
      status: 'issued',
      total: '333000.00',
      period_label: '',
      due_date: '2026-11-12',
      url: 'https://x/i/2',
    },
    {
      number: 'INV-3',
      status: 'overdue',
      total: '333000.00',
      period_label: '',
      due_date: '2026-09-12',
      url: 'https://x/i/3',
    },
    {
      number: 'INV-4',
      status: 'void',
      total: '333000.00',
      period_label: '',
      due_date: '',
      url: '',
    },
  ],
}

async function mountPage(view: SubscriptionView) {
  subscription.mockResolvedValue(view)
  const wrapper = mount(SubscriptionPage, { attachTo: document.body })
  await flushPromises()
  return wrapper
}

describe('SubscriptionPage', () => {
  beforeEach(() => {
    push.mockReset()
    subscription.mockReset()
    listListings.mockReset()
  })

  it('menampilkan banner, paket, fitur, dan invoice', async () => {
    const wrapper = await mountPage(base)
    expect(wrapper.get('[data-testid="subscription-banner"]').text()).toContain('Aktif')
    expect(wrapper.get('[data-testid="subscription-product"]').text()).toBe('Starter')
    expect(wrapper.text()).toContain('5 pengguna')
    expect(wrapper.findAll('tbody tr')).toHaveLength(4)
  })

  it('tombol Bayar hanya untuk invoice issued/overdue', async () => {
    const wrapper = await mountPage(base)
    const links = wrapper.findAll('[data-testid="pay-link"]')
    expect(links.map((l) => l.attributes('href'))).toEqual(['https://x/i/2', 'https://x/i/3'])
  })

  it('"Pilih paket" hanya saat free dan membawa ke checkout', async () => {
    let wrapper = await mountPage(base)
    expect(wrapper.text()).not.toContain('Pilih paket')

    listListings.mockResolvedValue([
      {
        id: 'c1',
        name: 'Paket',
        position: 1,
        listings: [
          {
            code: 'starter',
            name: 'Starter',
            order: 1,
            benefits: [],
            variants: [
              {
                product_id: 'p-m',
                billing_frequency: 'monthly',
                checkout_enabled: true,
                price_with_tax: '100000',
                currency: 'IDR',
              },
            ],
          },
        ],
      },
    ])
    wrapper = await mountPage({ ...base, status: 'free', product: null, invoices: [] })
    const open = wrapper.findAll('button').find((b) => b.text() === 'Pilih paket')
    expect(open).toBeTruthy()
    await open!.trigger('click')
    await flushPromises()
    // Modal di-teleport ke body.
    const planButton = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Starter'),
    ) as HTMLButtonElement
    planButton.click()
    await flushPromises()
    document.body.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    await flushPromises()
    expect(push).toHaveBeenCalledWith('/app/checkout?product=p-m')
  })

  it('gagal memuat → pesan galat dengan tombol muat ulang', async () => {
    subscription.mockRejectedValueOnce(new Error('boom'))
    const wrapper = mount(SubscriptionPage)
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('tidak dapat dimuat')
    subscription.mockResolvedValue(base)
    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="subscription-banner"]').exists()).toBe(true)
  })
})
