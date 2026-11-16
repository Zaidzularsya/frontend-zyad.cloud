import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: { onboard: { preview: vi.fn(), run: vi.fn() } },
}))
vi.mock('@/features/catalog/api/catalog.api', () => ({
  catalogApi: { products: vi.fn() },
}))
vi.mock('@/features/receivable/api/receivable.api', () => ({
  receivableApi: { settings: { get: vi.fn() } },
}))
vi.mock('@/features/crm/contacts/api/contacts.api', () => ({
  contactsApi: { list: vi.fn() },
}))

import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import { catalogApi } from '@/features/catalog/api/catalog.api'
import { receivableApi } from '@/features/receivable/api/receivable.api'
import { contactsApi } from '@/features/crm/contacts/api/contacts.api'
import OnboardingPanel from '@/features/mikrotik/components/OnboardingPanel.vue'
import { secret } from '@/features/mikrotik/testing/fixtures'
import type { OnboardPlan, SecretDetail } from '@/features/mikrotik/types'

const Stub = { template: '<div />' }
const PRODUCT = {
  id: 'p1',
  name: 'Internet 10M',
  base_price: '200000.00',
  charge_type: 'recurring',
  billing_frequency: 'monthly',
  payment_timing: 'prepaid',
  is_active: true,
}

function detail(over: Partial<SecretDetail> = {}): SecretDetail {
  return {
    secret: secret({ id: 's1', name: 'budi@pppoe' }),
    onboarding: null,
    contract: null,
    can_onboard: true,
    ...over,
  }
}

function plan(over: Partial<OnboardPlan> = {}): OnboardPlan {
  return {
    secret_name: 'budi@pppoe',
    contact_action: 'new',
    contact: { id: '', name: 'Sari', email: 'sari@b.com', phone: '0899' },
    product_name: 'Internet 10M',
    quantity: '1',
    unit_price: '200000.00',
    deal_title: 'Internet 10M - budi@pppoe',
    contract_start_date: '2026-10-25',
    initial_invoice: false,
    channels: ['email'],
    duplicate_of: null,
    ...over,
  }
}

async function mountPanel(d: SecretDetail = detail()) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Stub },
      { path: '/crm/products', name: 'crm-products', component: Stub },
      { path: '/sales/contracts/:id', name: 'contract-detail', component: Stub },
    ],
  })
  await router.push('/')
  const w = mount(OnboardingPanel, {
    props: { detail: d },
    attachTo: document.body,
    global: {
      plugins: [router, [VueQueryPlugin, { queryClient: new QueryClient() }]],
      // Tautan produk/kontrak diperiksa sebagai href nyata.
      stubs: { RouterLink: false },
    },
  })
  await flushPromises()
  return w
}

async function fillNewCustomer(w: Awaited<ReturnType<typeof mountPanel>>) {
  await w.get('input[name="customer_mode"][value="new"]').setValue(true)
  await w.get('input[name="new_name"]').setValue('Sari')
  await w.get('input[name="new_email"]').setValue('sari@b.com')
  await w.get('select[name="product_id"]').setValue('p1')
  await flushPromises()
}

describe('OnboardingPanel', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-12T03:00:00Z'))
    vi.mocked(catalogApi.products)
      .mockReset()
      .mockResolvedValue({ data: [PRODUCT], meta: { total: 1 } } as never)
    vi.mocked(receivableApi.settings.get)
      .mockReset()
      .mockResolvedValue({ default_billing_day: 25 } as never)
    vi.mocked(contactsApi.list)
      .mockReset()
      .mockResolvedValue({ data: [], meta: { total: 0 } } as never)
    vi.mocked(mikrotikApi.onboard.preview).mockReset().mockResolvedValue(plan())
    vi.mocked(mikrotikApi.onboard.run)
      .mockReset()
      .mockResolvedValue({ stage: 'paired' } as never)
  })
  afterEach(() => vi.useRealTimers())

  it('kotak invoice awal default tidak dicentang', async () => {
    const w = await mountPanel()
    const box = w.get('input[name="create_initial_invoice"]').element as HTMLInputElement
    expect(box.checked).toBe(false)
  })

  it('tanggal tagih terisi default tenant, selain itu tanggal hari ini', async () => {
    const w = await mountPanel()
    expect((w.get('input[name="billing_day"]').element as HTMLInputElement).value).toBe('25')

    vi.mocked(receivableApi.settings.get).mockResolvedValue({ default_billing_day: null } as never)
    const w2 = await mountPanel()
    expect((w2.get('input[name="billing_day"]').element as HTMLInputElement).value).toBe('12')
  })

  it('harga terisi dari katalog dan bisa diubah sebelum ringkasan', async () => {
    const w = await mountPanel()
    await fillNewCustomer(w)
    expect((w.get('input[name="unit_price"]').element as HTMLInputElement).value).toBe('200000.00')
    await w.get('input[name="unit_price"]').setValue('150000')
    await w.get('button[data-testid="onboard-review"]').trigger('click')
    await flushPromises()
    expect(mikrotikApi.onboard.preview).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({
        product_id: 'p1',
        unit_price: '150000',
        billing_day: 25,
        create_initial_invoice: false,
        customer: { new: { name: 'Sari', email: 'sari@b.com', phone: '' } },
      }),
    )
    expect(document.body.textContent).toContain('2026-10-25')
  })

  it('kontak ganda menampilkan tawaran pakai kontak yang ada', async () => {
    vi.mocked(mikrotikApi.onboard.preview).mockResolvedValueOnce(
      plan({ duplicate_of: { id: 'c-old', name: 'Budi Lama', email: 'sari@b.com', phone: '' } }),
    )
    const w = await mountPanel()
    await fillNewCustomer(w)
    await w.get('button[data-testid="onboard-review"]').trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('Budi Lama')
    const use = document.querySelector<HTMLButtonElement>('[data-testid="use-existing-contact"]')
    expect(use).not.toBeNull()
    // Jalankan tidak boleh tersedia selama kontak ganda.
    expect(document.querySelector('[data-testid="onboard-run"]')).toBeNull()
    use!.click()
    await flushPromises()
    expect(mikrotikApi.onboard.preview).toHaveBeenLastCalledWith(
      's1',
      expect.objectContaining({ customer: { contact_id: 'c-old' } }),
    )
  })

  it('kegagalan tahap menampilkan Lanjutkan dan tidak menggandakan', async () => {
    let resolveRun: (v: unknown) => void = () => {}
    vi.mocked(mikrotikApi.onboard.run).mockImplementation(
      () => new Promise((r) => (resolveRun = r)) as never,
    )
    const w = await mountPanel(
      detail({
        onboarding: {
          secret_id: 's1',
          stage: 'deal',
          contact_id: 'c1',
          deal_id: 'd1',
          quotation_id: '',
          sales_order_id: '',
          contract_id: '',
          account_id: '',
          last_error: 'Kuota penawaran bulan ini penuh.',
          updated_at: null,
        },
      }),
    )
    expect(w.text()).toContain('Kuota penawaran bulan ini penuh.')
    await w.get('select[name="product_id"]').setValue('p1')
    await flushPromises()
    await w.get('button[data-testid="onboard-resume"]').trigger('click')
    await flushPromises()
    // Lanjutkan juga melewati ringkasan yang harus dikonfirmasi (spec 3.2).
    expect(mikrotikApi.onboard.preview).toHaveBeenCalledTimes(1)
    expect(mikrotikApi.onboard.run).not.toHaveBeenCalled()
    const runButton = document.querySelector<HTMLButtonElement>('[data-testid="onboard-run"]')
    expect(runButton).not.toBeNull()
    runButton!.click()
    runButton!.click()
    await flushPromises()
    expect(mikrotikApi.onboard.run).toHaveBeenCalledTimes(1)
    resolveRun({ stage: 'paired' })
    await flushPromises()
  })

  it('Lanjutkan pada kontak baru yang ganda menawarkan kontak yang ada', async () => {
    vi.mocked(mikrotikApi.onboard.preview).mockResolvedValueOnce(
      plan({ duplicate_of: { id: 'c-old', name: 'Budi Lama', email: 'sari@b.com', phone: '' } }),
    )
    const w = await mountPanel(
      detail({
        onboarding: {
          secret_id: 's1',
          stage: '',
          contact_id: '',
          deal_id: '',
          quotation_id: '',
          sales_order_id: '',
          contract_id: '',
          account_id: '',
          last_error: 'Kuota kontak penuh.',
          updated_at: null,
        },
      }),
    )
    await fillNewCustomer(w)
    await w.get('button[data-testid="onboard-resume"]').trigger('click')
    await flushPromises()
    expect(document.querySelector('[data-testid="use-existing-contact"]')).not.toBeNull()
    expect(mikrotikApi.onboard.run).not.toHaveBeenCalled()
  })

  it('hanya produk bulanan yang ditawarkan', async () => {
    vi.mocked(catalogApi.products).mockResolvedValue({
      data: [
        PRODUCT,
        { ...PRODUCT, id: 'p-week', name: 'Voucher mingguan', billing_frequency: 'weekly' },
      ],
      meta: { total: 2 },
    } as never)
    const w = await mountPanel()
    const options = w.findAll('select[name="product_id"] option').map((o) => o.attributes('value'))
    expect(options).toContain('p1')
    expect(options).not.toContain('p-week')
  })

  it('katalog kosong menampilkan tautan buat produk', async () => {
    vi.mocked(catalogApi.products).mockResolvedValue({ data: [], meta: { total: 0 } } as never)
    const w = await mountPanel()
    const link = w.get('a[data-testid="create-product"]')
    expect(link.attributes('href')).toBe('/crm/products')
    expect(w.find('button[data-testid="onboard-review"]').attributes('disabled')).toBeDefined()
  })

  it('secret terpasang dengan kontrak menonaktifkan tombol', async () => {
    const w = await mountPanel(
      detail({ can_onboard: false, contract: { id: 'ct1', number: 'CTR-2026-0007' } }),
    )
    expect(w.text()).toContain('CTR-2026-0007')
    expect(w.find('button[data-testid="onboard-review"]').exists()).toBe(false)
    expect(w.get('a[data-testid="contract-link"]').attributes('href')).toBe('/sales/contracts/ct1')
  })
})
