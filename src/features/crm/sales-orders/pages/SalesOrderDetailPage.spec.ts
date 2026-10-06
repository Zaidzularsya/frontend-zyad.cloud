import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { SalesOrder } from '@/features/crm/sales-orders/api/sales-orders.api'

const state = vi.hoisted(() => ({ order: null as unknown }))
vi.mock('@/features/crm/sales-orders/api/sales-orders.api', () => ({
  salesOrdersApi: { get: vi.fn(async () => state.order) },
}))

import { useAuthStore } from '@/stores/auth.store'
import SalesOrderDetailPage from './SalesOrderDetailPage.vue'

const baseOrder = (over: Partial<SalesOrder>): SalesOrder => ({
  id: 'so1',
  so_number: 'SO-2026-0001',
  quotation_id: 'q1',
  quotation_number: 'QUO-2026-0001',
  deal_id: 'd1',
  contact_id: 'c1',
  company_id: null,
  status: 'draft',
  billing_status: 'none',
  billing_error: '',
  start_date: null,
  bill_to_name: 'Budi',
  bill_to_company: '',
  bill_to_email: 'budi@example.com',
  bill_to_phone: '0812',
  bill_to_address: '',
  channels: ['email'],
  pic_user_id: '',
  currency: 'IDR',
  subtotal: '800000.00',
  tax_total: '33000.00',
  grand_total: '833000.00',
  first_invoice_total: '833000.00',
  recurring_totals: {},
  initial_invoice: null,
  contract: null,
  items: [
    {
      id: 'it1',
      description: 'Instalasi',
      quantity: '1',
      unit: '',
      unit_price: '500000',
      discount_percent: '',
      tax_percent: '0',
      tax_amount: '0',
      line_total: '500000.00',
      charge_type: 'one_time',
      billing_frequency: null,
      payment_timing: 'prepaid',
      delivery_status: 'not_applicable',
      delivered_at: null,
      delivery_note: '',
      invoice_id: '',
      position: 0,
    },
    {
      id: 'it2',
      description: 'Website',
      quantity: '1',
      unit: '',
      unit_price: '5000000',
      discount_percent: '',
      tax_percent: '0',
      tax_amount: '0',
      line_total: '5000000.00',
      charge_type: 'one_time',
      billing_frequency: null,
      payment_timing: 'postpaid',
      delivery_status: 'pending',
      delivered_at: null,
      delivery_note: '',
      invoice_id: '',
      position: 1,
    },
  ],
  confirmed_at: null,
  created_at: '',
  updated_at: '',
  ...over,
})

async function mountPage(order: SalesOrder, permissions: string[]) {
  state.order = order
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  vi.spyOn(auth, 'can').mockImplementation((p) => permissions.includes(p))
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/app/sales/orders/:id', component: SalesOrderDetailPage }],
  })
  await router.push('/app/sales/orders/so1')
  await router.isReady()
  const wrapper = mount(SalesOrderDetailPage, {
    global: {
      plugins: [
        pinia,
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

describe('SalesOrderDetailPage', () => {
  it('shows the form and the Konfirmasi button for a draft', async () => {
    const wrapper = await mountPage(baseOrder({}), [
      'sales_order.read',
      'sales_order.manage',
      'sales_order.confirm',
    ])
    expect(wrapper.find('input[name="start_date"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Konfirmasi SO')
    expect(wrapper.text()).toContain('Sekali bayar · Prabayar')
  })

  it('hides Konfirmasi without the confirm permission', async () => {
    const wrapper = await mountPage(baseOrder({}), ['sales_order.read'])
    expect(wrapper.text()).not.toContain('Konfirmasi SO')
  })

  it('shows a red banner with retry when billing failed', async () => {
    const wrapper = await mountPage(
      baseOrder({
        status: 'confirmed',
        billing_status: 'failed',
        billing_error: 'Penagihan gagal dibuat. Coba lagi beberapa saat.',
      }),
      ['sales_order.read', 'sales_order.confirm'],
    )
    expect(wrapper.find('[role="alert"]').text()).toContain('Penagihan gagal dibuat')
    expect(wrapper.text()).toContain('Coba lagi penagihan')
  })

  it('offers receipt confirmation for pending postpaid items', async () => {
    const wrapper = await mountPage(baseOrder({ status: 'confirmed', billing_status: 'done' }), [
      'sales_order.read',
      'sales_order.confirm',
    ])
    const checkbox = wrapper.find('input[type="checkbox"][aria-label="Pilih Website"]')
    expect(checkbox.exists()).toBe(true)
    await checkbox.setValue(true)
    expect(wrapper.text()).toContain('Konfirmasi diterima (1)')
  })
})
