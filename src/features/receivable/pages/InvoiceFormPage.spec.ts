import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'

const { accountsList, settingsGet, create, update, get, senders } = vi.hoisted(() => ({
  accountsList: vi.fn(),
  settingsGet: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  get: vi.fn(),
  senders: vi.fn(),
}))
vi.mock('@/features/receivable/api/receivable.api', () => ({
  receivableApi: {
    accounts: { list: accountsList, create: vi.fn() },
    settings: { get: settingsGet },
    senders,
    invoices: { create, update, get },
  },
}))
vi.mock('@/features/catalog/api/catalog.api', () => ({
  catalogApi: { products: vi.fn().mockResolvedValue({ data: [], meta: {} }) },
}))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => ({ can: () => true }) }))

import InvoiceFormPage from './InvoiceFormPage.vue'

const budi = {
  id: '33333333-3333-3333-3333-333333333333',
  name: 'Budi',
  company_name: 'PT Maju',
  email: 'budi@example.com',
  phone: '',
  address: '',
  contact_id: null,
  created_at: '',
}

async function mountForm(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/billing/invoices/new', component: InvoiceFormPage },
      { path: '/app/billing/invoices/:id/edit', component: InvoiceFormPage },
      {
        path: '/app/billing/invoices/:id',
        name: 'detail',
        component: { template: '<div>detail</div>' },
      },
      { path: '/app/billing/invoices', component: { template: '<div>list</div>' } },
    ],
  })
  await router.push(path)
  const w = mount(InvoiceFormPage, {
    global: {
      plugins: [
        router,
        [
          VueQueryPlugin,
          { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        ],
      ],
      stubs: { teleport: true },
    },
    attachTo: document.body,
  })
  await flushPromises()
  return { w, router }
}

const button = (w: Awaited<ReturnType<typeof mountForm>>['w'], label: string) =>
  w.findAll('button').find((b) => b.text().includes(label))

describe('InvoiceFormPage', () => {
  beforeEach(() => {
    for (const fn of [accountsList, settingsGet, create, update, get, senders]) fn.mockReset()
    accountsList.mockResolvedValue({
      data: [budi],
      meta: { page: 1, per_page: 8, total: 1, total_pages: 1 },
    })
    settingsGet.mockResolvedValue({
      invoice_lead_days: 7,
      payment_terms_days: 7,
      default_channels: ['whatsapp'],
      default_sender_user_id: null,
    })
    senders.mockResolvedValue([])
    document.body.innerHTML = ''
  })

  it('creates a draft with the picked account, default channels and a free line', async () => {
    create.mockResolvedValue({ id: 'inv-1' })
    const { w, router } = await mountForm('/app/billing/invoices/new')
    // default channels come from the settings
    expect((w.get('input[name="channel-whatsapp"]').element as HTMLInputElement).checked).toBe(true)
    expect((w.get('input[name="channel-email"]').element as HTMLInputElement).checked).toBe(false)

    await w.get('[role="option"]').trigger('click') // pick Budi from the search results
    await button(w, 'Baris bebas')!.trigger('click')
    await w.get('input[name="item-description"]').setValue('Instalasi')
    await w.get('input[aria-label="Harga item 1"]').setValue('33000')
    await w.get('input[name="channel-email"]').setValue(true)

    await w.get('form').trigger('submit')
    await flushPromises()

    expect(create).toHaveBeenCalledTimes(1)
    const payload = create.mock.calls[0]![0]
    expect(payload).toMatchObject({ account_id: budi.id, channels: ['email', 'whatsapp'] })
    expect(payload.items[0]).toMatchObject({
      description: 'Instalasi',
      unit_price: '33000',
      charge_type: 'one_time',
    })
    expect(router.currentRoute.value.path).toBe('/app/billing/invoices/inv-1')
  })

  it('does not submit without a customer or items and says why', async () => {
    const { w } = await mountForm('/app/billing/invoices/new')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(create).not.toHaveBeenCalled()
    expect(w.text()).toContain('Pilih pelanggan.')

    await w.get('[role="option"]').trigger('click')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Tambahkan minimal satu item.')
    expect(create).not.toHaveBeenCalled()
  })

  it('shows the server validation message and stays on the form', async () => {
    create.mockRejectedValue({
      response: {
        data: { code: 'VALIDATION_ERROR', message: 'PIC harus anggota aktif organisasi ini.' },
      },
    })
    const { w, router } = await mountForm('/app/billing/invoices/new')
    await w.get('[role="option"]').trigger('click')
    await button(w, 'Baris bebas')!.trigger('click')
    await w.get('input[name="item-description"]').setValue('Instalasi')
    await w.get('input[aria-label="Harga item 1"]').setValue('1000')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('PIC harus anggota aktif organisasi ini.')
    expect(router.currentRoute.value.path).toBe('/app/billing/invoices/new')
  })

  it('refuses to edit an invoice that is no longer a draft', async () => {
    get.mockResolvedValue({
      id: 'inv-9',
      status: 'issued',
      invoice_number: 'INV-1',
      account: budi,
      channels: ['email'],
      items: [],
      currency: 'IDR',
      created_at: '',
    })
    const { w } = await mountForm('/app/billing/invoices/inv-9/edit')
    expect(w.text()).toContain('sudah diterbitkan dan tidak bisa diubah')
    expect(w.find('form').exists()).toBe(false)
  })

  it('loads a draft into the form and saves changes with PUT', async () => {
    get.mockResolvedValue({
      id: 'inv-2',
      status: 'draft',
      invoice_number: null,
      account: budi,
      channels: ['email'],
      pic_user_id: null,
      notes: 'lama',
      period_start: null,
      period_end: null,
      currency: 'IDR',
      created_at: '',
      items: [
        {
          id: 'i1',
          description: 'Internet',
          quantity: '1.00',
          unit: 'bulan',
          unit_price: '300000.00',
          discount_percent: null,
          tax_percent: '0.00',
          tax_amount: '0.00',
          line_total: '300000.00',
          product_id: null,
          sku: '',
          charge_type: 'one_time',
          billing_frequency: null,
          payment_timing: 'prepaid',
          period_start: null,
          period_end: null,
          position: 0,
        },
      ],
    })
    update.mockResolvedValue({ id: 'inv-2' })
    const { w } = await mountForm('/app/billing/invoices/inv-2/edit')
    expect((w.get('input[name="item-description"]').element as HTMLInputElement).value).toBe(
      'Internet',
    )
    expect(w.text()).toContain('Budi')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(update).toHaveBeenCalledTimes(1)
    expect(update.mock.calls[0]![0]).toBe('inv-2')
    expect(update.mock.calls[0]![1]).toMatchObject({ account_id: budi.id, notes: 'lama' })
  })
})
