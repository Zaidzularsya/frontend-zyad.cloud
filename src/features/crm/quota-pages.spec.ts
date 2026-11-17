import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const summary = vi.hoisted(() => vi.fn())
const push = vi.hoisted(() => vi.fn())
vi.mock('@/features/entitlements/api/entitlements.api', () => ({ entitlementsApi: { summary } }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/app/crm/quotations', query: {} }),
  useRouter: () => ({ push }),
  RouterLink: { template: '<a><slot /></a>' },
}))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => ({ can: () => true }) }))

const listQuery = vi.hoisted(() => () => ({
  data: { value: { data: [], meta: { page: 1, per_page: 50, total: 0, total_pages: 0 } } },
  isPending: { value: false },
  isError: { value: false },
  isFetching: { value: false },
}))
vi.mock('@/features/crm/quotations/api/quotations.queries', () => ({
  useQuotationsQuery: listQuery,
}))
vi.mock('@/features/crm/sales-orders/api/sales-orders.queries', () => ({
  useSalesOrdersQuery: listQuery,
}))

import QuotationsPage from './quotations/pages/QuotationsPage.vue'
import SalesOrdersPage from './sales-orders/pages/SalesOrdersPage.vue'
import DealQuotationsPanel from './quotations/components/DealQuotationsPanel.vue'

const quota = (key: string, atLimit: boolean) => [
  {
    feature_key: key,
    module: 'crm',
    name: key,
    state: 'quota',
    limit: 10,
    used: atLimit ? 10 : 1,
    remaining: atLimit ? 0 : 9,
    reset_strategy: 'monthly',
    at_limit: atLimit,
  },
]

async function mountWith(component: object, props: Record<string, unknown> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const w = mount(component, {
    props,
    global: { plugins: [[VueQueryPlugin, { queryClient: client }]] },
  })
  await flushPromises()
  return w
}

describe.each([
  ['QuotationsPage', QuotationsPage, {}, 'crm.max_quotations_per_month', 'Kuota quotation'],
  ['SalesOrdersPage', SalesOrdersPage, {}, 'crm.max_sales_orders_per_month', 'Kuota sales order'],
  [
    'DealQuotationsPanel',
    DealQuotationsPanel,
    { dealId: 'd1' },
    'crm.max_quotations_per_month',
    null,
  ],
])('%s quota', (_name, component, props, key, bannerText) => {
  beforeEach(() => push.mockClear())

  it('reflects a full quota', async () => {
    summary.mockResolvedValue(quota(key, true))
    const w = await mountWith(component, props)
    if (bannerText) expect(w.get('[role="status"]').text()).toContain(bannerText)
    else expect(w.text()).toContain('Upgrade untuk buat quotation')
  })

  it('stays normal when there is room', async () => {
    summary.mockResolvedValue(quota(key, false))
    const w = await mountWith(component, props)
    expect(w.find('[role="status"]').exists()).toBe(false)
    expect(w.text()).not.toContain('Upgrade untuk')
  })
})
