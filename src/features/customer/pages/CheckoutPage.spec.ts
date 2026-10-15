import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, reactive } from 'vue'

import type { PublicListingCategory } from '@/features/public/api/public-catalog.api'

const replace = vi.fn()
const route = reactive<{ query: Record<string, string> }>({ query: { product: 'p-m' } })
const checkout = vi.fn()
const listListings = vi.fn()
const assign = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ replace }),
  RouterLink: defineComponent({
    props: { to: { type: [String, Object], default: '' } },
    template: '<a :data-to="typeof to === \'string\' ? to : JSON.stringify(to)"><slot /></a>',
  }),
}))
vi.mock('@/features/public/api/public-catalog.api', () => ({
  publicCatalogApi: { listListings: (...a: unknown[]) => listListings(...a) },
}))
vi.mock('@/features/customer/api/self-serve.api', async () => {
  const actual = await vi.importActual<typeof import('@/features/customer/api/self-serve.api')>(
    '@/features/customer/api/self-serve.api',
  )
  return { ...actual, selfServeApi: { checkout: (...a: unknown[]) => checkout(...a) } }
})

import CheckoutPage from './CheckoutPage.vue'

const categories: PublicListingCategory[] = [
  {
    id: 'c1',
    name: 'Paket',
    position: 1,
    listings: [
      {
        code: 'freelancer',
        name: 'Freelancer',
        order: 1,
        benefits: [{ label: '3 halaman' }, { label: 'Domain kustom' }],
        variants: [
          {
            product_id: 'p-m',
            sku: 'FREELANCER-M',
            charge_type: 'recurring',
            billing_frequency: 'monthly',
            payment_timing: 'prepaid',
            currency: 'IDR',
            base_price: '100000',
            tax_percent: '11',
            price_with_tax: '111000',
            checkout_enabled: true,
          },
        ],
      },
    ],
  },
]

function apiError(code: string) {
  return { response: { data: { code } } }
}

async function mountPage() {
  const wrapper = mount(CheckoutPage, {
    global: { stubs: { PageHeader: true } },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.useFakeTimers()
  replace.mockReset()
  checkout.mockReset()
  assign.mockReset()
  listListings.mockReset()
  listListings.mockResolvedValue(categories)
  route.query = { product: 'p-m' }
  vi.stubGlobal('location', { assign })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('CheckoutPage', () => {
  it('tanpa ?product= → redirect ke /app/billing', async () => {
    route.query = {}
    await mountPage()
    expect(replace).toHaveBeenCalledWith('/app/billing')
    expect(listListings).not.toHaveBeenCalled()
  })

  it('produk tidak ditemukan di listing → redirect ke /app/billing', async () => {
    route.query = { product: 'ghost' }
    await mountPage()
    expect(replace).toHaveBeenCalledWith('/app/billing')
  })

  it('menampilkan ringkasan: nama, SKU, frekuensi, harga + pajak, benefit, dan catatan tagihan', async () => {
    const wrapper = await mountPage()
    expect(replace).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Freelancer')
    expect(wrapper.find('[data-testid="checkout-sku"]').text()).toBe('FREELANCER-M')
    expect(wrapper.text()).toContain('Bulanan')
    expect(wrapper.find('[data-testid="checkout-base"]').text()).toMatch(/100\.000/)
    expect(wrapper.find('[data-testid="checkout-tax"]').text()).toMatch(/11\.000/)
    expect(wrapper.text()).toContain('Pajak (11%)')
    expect(wrapper.find('[data-testid="checkout-total"]').text()).toMatch(/111\.000/)
    expect(wrapper.text()).toContain('3 halaman')
    expect(wrapper.text()).toContain('Domain kustom')
    expect(wrapper.find('[data-testid="checkout-billing-note"]').text()).toBe(
      'Mulai hari ini, ditagih ulang setiap bulan.',
    )
  })

  it('"Bayar sekarang" memanggil checkout sekali (disabled saat pending) lalu pindah ke invoice_url', async () => {
    let resolve!: (v: { invoice_url: string; deal_id: string }) => void
    checkout.mockReturnValue(new Promise((r) => (resolve = r)))
    const wrapper = await mountPage()
    const button = wrapper.find('[data-testid="checkout-pay"]')
    await button.trigger('click')
    await button.trigger('click')
    expect(checkout).toHaveBeenCalledTimes(1)
    expect(checkout).toHaveBeenCalledWith('p-m')
    expect(button.attributes('disabled')).toBeDefined()

    resolve({ invoice_url: 'https://pay.test/inv', deal_id: 'd1' })
    await flushPromises()
    expect(assign).toHaveBeenCalledWith('https://pay.test/inv')
  })

  it('SELF_SERVE_IN_PROGRESS → "Memproses…" dan otomatis coba lagi tiap 2 detik', async () => {
    checkout
      .mockRejectedValueOnce(apiError('SELF_SERVE_IN_PROGRESS'))
      .mockResolvedValueOnce({ invoice_url: 'https://pay.test/inv', deal_id: 'd1' })
    const wrapper = await mountPage()
    await wrapper.find('[data-testid="checkout-pay"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="checkout-notice"]').text()).toBe('Memproses…')
    expect(checkout).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(2000)
    expect(checkout).toHaveBeenCalledTimes(2)
    expect(assign).toHaveBeenCalledWith('https://pay.test/inv')
  })

  it('SELF_SERVE_IN_PROGRESS terus-menerus berhenti setelah 5 percobaan ulang', async () => {
    checkout.mockRejectedValue(apiError('SELF_SERVE_IN_PROGRESS'))
    const wrapper = await mountPage()
    await wrapper.find('[data-testid="checkout-pay"]').trigger('click')
    await flushPromises()
    for (let i = 0; i < 10; i++) await vi.advanceTimersByTimeAsync(2000)
    expect(checkout).toHaveBeenCalledTimes(1 + 5)
    expect(assign).not.toHaveBeenCalled()
  })

  it('SELF_SERVE_ALREADY_SUBSCRIBED → pesan + tautan ke /app/billing', async () => {
    checkout.mockRejectedValue(apiError('SELF_SERVE_ALREADY_SUBSCRIBED'))
    const wrapper = await mountPage()
    await wrapper.find('[data-testid="checkout-pay"]').trigger('click')
    await flushPromises()
    const notice = wrapper.find('[data-testid="checkout-notice"]')
    expect(notice.text()).toContain(
      'Workspace ini sudah berlangganan. Hubungi sales untuk pindah paket.',
    )
    expect(notice.find('a').attributes('data-to')).toBe('/app/billing')
    expect(wrapper.find('[data-testid="checkout-pay"]').exists()).toBe(false)
  })

  it('SELF_SERVE_STEP_FAILED → pesan + tombol coba lagi yang memanggil ulang checkout', async () => {
    checkout
      .mockRejectedValueOnce(apiError('SELF_SERVE_STEP_FAILED'))
      .mockResolvedValueOnce({ invoice_url: 'https://pay.test/inv', deal_id: 'd1' })
    const wrapper = await mountPage()
    await wrapper.find('[data-testid="checkout-pay"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="checkout-notice"]').text()).toBe(
      'Pembayaran belum bisa disiapkan. Coba lagi.',
    )
    await wrapper.find('[data-testid="checkout-retry"]').trigger('click')
    await flushPromises()
    expect(checkout).toHaveBeenCalledTimes(2)
    expect(assign).toHaveBeenCalledWith('https://pay.test/inv')
  })
})
