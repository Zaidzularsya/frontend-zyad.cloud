import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import type {
  PublicListing,
  PublicListingCategory,
  PublicListingVariant,
} from '@/features/public/api/public-catalog.api'

const push = vi.fn()
const listListings = vi.fn()
const authState = { isAuthenticated: false }
const editMode = ref(false)

vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => authState }))
vi.mock('@/features/public/api/public-catalog.api', () => ({
  publicCatalogApi: { listListings: (...a: unknown[]) => listListings(...a) },
}))
vi.mock('../../composables/useEditMode', () => ({ useEditMode: () => editMode }))

import PricingSection from './PricingSection.vue'

function variant(over: Partial<PublicListingVariant>): PublicListingVariant {
  return {
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
    ...over,
  }
}

function listing(over: Partial<PublicListing>): PublicListing {
  return {
    code: 'freelancer',
    name: 'Freelancer',
    order: 1,
    benefits: [{ label: '3 halaman' }],
    variants: [variant({}), variant({ product_id: 'p-y', billing_frequency: 'annual' })],
    ...over,
  }
}

const planCategory: PublicListingCategory = {
  id: 'c-plan',
  name: 'Paket Langganan',
  position: 1,
  listings: [
    listing({}),
    listing({
      code: 'free',
      name: 'Free',
      order: 0,
      variants: [
        variant({
          product_id: 'p-free',
          price_with_tax: '0',
          base_price: '0',
          checkout_enabled: false,
        }),
      ],
    }),
  ],
}

const projectCategory: PublicListingCategory = {
  id: 'c-proj',
  name: 'Proyek',
  position: 2,
  listings: [
    listing({
      code: 'website',
      name: 'Website Custom',
      variants: [
        variant({
          product_id: 'p-web',
          charge_type: 'one_time',
          billing_frequency: null,
          payment_timing: 'postpaid',
          checkout_enabled: false,
        }),
      ],
    }),
  ],
}

async function render(categories: PublicListingCategory[], content: Record<string, unknown> = {}) {
  listListings.mockResolvedValue(categories)
  const wrapper = mount(PricingSection, {
    props: { content: { source: 'platform_catalog', ...content } },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  push.mockReset()
  listListings.mockReset()
  authState.isAuthenticated = false
  editMode.value = false
})

describe('PricingSection (platform_catalog)', () => {
  it('satu kategori → tidak ada tab', async () => {
    const wrapper = await render([planCategory])
    expect(wrapper.findAll('[data-testid="pricing-tab"]')).toHaveLength(0)
    expect(wrapper.findAll('[data-testid="pricing-card"]')).toHaveLength(2)
  })

  it('dua kategori → tab; klik tab mengganti kartu', async () => {
    const wrapper = await render([planCategory, projectCategory])
    const tabs = wrapper.findAll('[data-testid="pricing-tab"]')
    expect(tabs.map((t) => t.text())).toEqual(['Paket Langganan', 'Proyek'])
    expect(wrapper.text()).toContain('Freelancer')
    await tabs[1]!.trigger('click')
    const cards = wrapper.findAll('[data-testid="pricing-card"]')
    expect(cards).toHaveLength(1)
    expect(cards[0]!.text()).toContain('Website Custom')
    expect(wrapper.text()).not.toContain('Freelancer')
  })

  it('toggle frekuensi hanya berisi frekuensi kategori aktif dan mengganti harga', async () => {
    const wrapper = await render([planCategory, projectCategory])
    const freqs = wrapper.findAll('[data-testid="pricing-frequency"]')
    expect(freqs.map((f) => f.text())).toEqual(['Bulanan', 'Tahunan'])
    await freqs[1]!.trigger('click')
    expect(wrapper.text()).toContain('/tahun')
    // kategori proyek tidak punya frekuensi → tidak ada toggle
    await wrapper.findAll('[data-testid="pricing-tab"]')[1]!.trigger('click')
    expect(wrapper.findAll('[data-testid="pricing-frequency"]')).toHaveLength(0)
  })

  it('tombol checkout belum login → register dengan redirect', async () => {
    const wrapper = await render([planCategory])
    const cta = wrapper
      .findAll('[data-testid="pricing-cta"]')
      .find((b) => b.text() === 'Pilih Freelancer')!
    await cta.trigger('click')
    expect(push).toHaveBeenCalledWith(
      '/auth/register?redirect=' + encodeURIComponent('/app/checkout?product=p-m'),
    )
  })

  it('sudah login → langsung ke checkout; frekuensi tahunan memakai produk tahunan', async () => {
    authState.isAuthenticated = true
    const wrapper = await render([planCategory])
    await wrapper.findAll('[data-testid="pricing-frequency"]')[1]!.trigger('click')
    await wrapper
      .findAll('[data-testid="pricing-cta"]')
      .find((b) => b.text() === 'Pilih Freelancer')!
      .trigger('click')
    expect(push).toHaveBeenCalledWith('/app/checkout?product=p-y')
  })

  it('kartu gratis "Mulai gratis" → register / dashboard', async () => {
    const wrapper = await render([planCategory])
    const free = wrapper
      .findAll('[data-testid="pricing-cta"]')
      .find((b) => b.text() === 'Mulai gratis')!
    await free.trigger('click')
    expect(push).toHaveBeenLastCalledWith('/auth/register')
    authState.isAuthenticated = true
    await free.trigger('click')
    expect(push).toHaveBeenLastCalledWith('/app/dashboard')
  })

  it('"Hubungi sales" → href contactSalesHref (default #contact)', async () => {
    const def = await render([projectCategory])
    expect(def.find('a[data-testid="pricing-cta"]').attributes('href')).toBe('#contact')
    const custom = await render([projectCategory], { contactSalesHref: '/kontak' })
    expect(custom.find('a[data-testid="pricing-cta"]').attributes('href')).toBe('/kontak')
  })

  it('di mode edit tidak memanggil API katalog', async () => {
    editMode.value = true
    await render([planCategory])
    expect(listListings).not.toHaveBeenCalled()
  })

  it('gagal memuat → pesan galat', async () => {
    listListings.mockRejectedValue(new Error('x'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = mount(PricingSection, { props: { content: { source: 'platform_catalog' } } })
    await flushPromises()
    expect(wrapper.text()).toContain('Paket tidak dapat dimuat saat ini.')
  })
})

describe('PricingSection (custom)', () => {
  it('perilaku lama tidak berubah: render plans dari konten tanpa memanggil API', async () => {
    const wrapper = mount(PricingSection, {
      props: {
        content: {
          source: 'custom',
          plans: [{ name: 'Starter', priceLabel: 'Rp 99rb', features: ['A', 'B'] }],
        },
      },
    })
    await flushPromises()
    expect(listListings).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Starter')
    expect(wrapper.text()).toContain('Rp 99rb')
    expect(wrapper.text()).toContain('A')
    expect(wrapper.find('[data-testid="pricing-tab"]').exists()).toBe(false)
  })
})
