import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const summary = vi.hoisted(() => vi.fn())
const invoicesList = vi.hoisted(() => vi.fn())
const push = vi.hoisted(() => vi.fn())
vi.mock('@/features/entitlements/api/entitlements.api', () => ({ entitlementsApi: { summary } }))
vi.mock('@/features/receivable/api/receivable.api', () => ({
  receivableApi: { invoices: { list: invoicesList } },
}))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => ({ can: () => true }) }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/app/billing/invoices' }),
  useRouter: () => ({ push }),
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}))

import InvoicesPage from './InvoicesPage.vue'

const quota = (atLimit: boolean) => [
  {
    feature_key: 'receivable.max_invoices_per_month',
    module: 'receivable',
    name: 'Maks. invoice',
    state: 'quota',
    limit: 10,
    used: atLimit ? 10 : 2,
    remaining: atLimit ? 0 : 8,
    reset_strategy: 'monthly',
    at_limit: atLimit,
  },
]

const invoice = {
  id: 'inv-1',
  invoice_number: 'INV-001',
  status: 'issued',
  account: { name: 'Budi', company_name: 'PT Maju' },
  issue_date: '2026-10-01',
  due_date: '2026-10-15',
  grand_total: '1000.00',
  balance: '1000.00',
}

async function mountPage() {
  const w = mount(InvoicesPage, {
    global: {
      plugins: [
        [
          VueQueryPlugin,
          { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        ],
      ],
      stubs: { RouterLink: { template: '<a><slot /></a>' } },
    },
  })
  await flushPromises()
  return w
}

describe('InvoicesPage quota', () => {
  beforeEach(() => {
    push.mockClear()
    invoicesList.mockResolvedValue({ data: [invoice], meta: { total: 1 } })
  })

  it('shows banner and upgrade button when invoice quota is full', async () => {
    summary.mockResolvedValue(quota(true))
    const w = await mountPage()
    expect(w.get('[role="status"]').text()).toContain('Kuota invoice')
    expect(w.text()).not.toContain('Invoice baru')
    await w
      .findAll('button')
      .find((b) => b.text() === 'Upgrade untuk tambah invoice')!
      .trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'billing' })
  })

  it('keeps the invoice list available when quota is full', async () => {
    summary.mockResolvedValue(quota(true))
    const w = await mountPage()
    expect(w.text()).toContain('INV-001')
  })

  it('shows normal new-invoice button when room', async () => {
    summary.mockResolvedValue(quota(false))
    const w = await mountPage()
    expect(w.find('[role="status"]').exists()).toBe(false)
    await w
      .findAll('button')
      .find((b) => b.text().includes('Invoice baru'))!
      .trigger('click')
    expect(push).toHaveBeenCalledWith('/app/billing/invoices/new')
  })
})
