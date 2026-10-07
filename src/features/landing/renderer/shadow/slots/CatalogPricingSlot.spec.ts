import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'

import type {
  PublicListing,
  PublicListingCategory,
  PublicListingVariant,
} from '@/features/public/api/public-catalog.api'

import { LANDING_PAGE_CONTEXT } from '../page-context'

const push = vi.fn()
const listListings = vi.fn()
const authState = { isAuthenticated: false }

vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => authState }))
vi.mock('@/features/public/api/public-catalog.api', () => ({
  publicCatalogApi: { listListings: (...a: unknown[]) => listListings(...a) },
}))

import CatalogPricingSlot from './CatalogPricingSlot.vue'

function variant(over: Partial<PublicListingVariant>): PublicListingVariant {
  return {
    product_id: 'p1',
    sku: 'S',
    charge_type: 'recurring',
    billing_frequency: 'monthly',
    payment_timing: 'prepaid',
    currency: 'IDR',
    base_price: '100000',
    tax_percent: '0',
    price_with_tax: '100000',
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
    variants: [
      variant({}),
      variant({ product_id: 'p1y', billing_frequency: 'annual', price_with_tax: '1000000' }),
    ],
    ...over,
  }
}

function category(id: string, over: Partial<PublicListingCategory> = {}): PublicListingCategory {
  return {
    id,
    name: `Kat ${id}`,
    position: 1,
    listings: [listing({})],
    ...over,
  }
}

const monthlyOnly = (code: string, name: string): PublicListing =>
  listing({ code, name, variants: [variant({ product_id: `${code}-m` })] })

function ctxFor(orgType = 'platform') {
  return {
    orgType: computed(() => orgType),
    interest: ref(''),
    scrollToId: vi.fn(),
  }
}

function mountSlot(config: unknown = {}, ctx = ctxFor()) {
  const w = mount(CatalogPricingSlot, {
    props: {
      host: document.createElement('div'),
      chrome: {},
      dataset: { zyadConfig: JSON.stringify(config) },
    },
    global: { provide: { [LANDING_PAGE_CONTEXT as symbol]: ctx } },
  })
  return { w, ctx }
}

beforeEach(() => {
  push.mockReset()
  listListings.mockReset()
  authState.isAuthenticated = false
})

describe('CatalogPricingSlot', () => {
  it('renders nothing and does not fetch for non-platform orgs', async () => {
    listListings.mockResolvedValue([category('c1')])
    const { w } = mountSlot({}, ctxFor('customer'))
    await flushPromises()
    expect(listListings).not.toHaveBeenCalled()
    expect(w.html()).not.toContain('zy-slot-catalog-pricing')
  })

  it('renders tabs only with more than one category', async () => {
    listListings.mockResolvedValue([category('c1')])
    const one = mountSlot()
    await flushPromises()
    expect(one.w.find('[role="tablist"]').exists()).toBe(false)

    listListings.mockResolvedValue([category('c1'), category('c2', { position: 2 })])
    const two = mountSlot()
    await flushPromises()
    const tabs = two.w.findAll('[role="tab"]')
    expect(tabs).toHaveLength(2)
    expect(tabs[0]!.attributes('aria-selected')).toBe('true')
  })

  it('falls back to all categories when configured ids are gone', async () => {
    listListings.mockResolvedValue([category('c1'), category('c2', { position: 2 })])
    const { w } = mountSlot({ categoryIds: ['gone'] })
    await flushPromises()
    expect(w.findAll('[role="tab"]')).toHaveLength(2)
  })

  it('renders nothing when there are no public categories at all', async () => {
    listListings.mockResolvedValue([category('c1', { listings: [] })])
    const { w } = mountSlot()
    await flushPromises()
    expect(w.html()).not.toContain('zy-slot-catalog-pricing')
  })

  it('hides frequency toggle and savings when only monthly exists', async () => {
    listListings.mockResolvedValue([category('c1', { listings: [monthlyOnly('a', 'A')] })])
    const { w } = mountSlot()
    await flushPromises()
    expect(w.find('[aria-pressed]').exists()).toBe(false)
    expect(w.text()).not.toContain('Hemat')
  })

  it('shows "Hemat s.d. 17%" on the toggle and per-card badge when yearly selected', async () => {
    listListings.mockResolvedValue([category('c1')])
    const { w } = mountSlot()
    await flushPromises()
    expect(w.text()).toContain('Hemat s.d. 17%')
    expect(w.text()).not.toContain('Hemat 17%')
    const yearly = w.findAll('[aria-pressed]').find((b) => b.text().includes('Tahunan'))!
    await yearly.trigger('click')
    expect(yearly.attributes('aria-pressed')).toBe('true')
    expect(w.text()).toContain('Hemat 17%')
  })

  it('checkout CTA: guest → /auth/register?redirect=…, logged-in → /app/checkout?product=p1', async () => {
    listListings.mockResolvedValue([category('c1')])
    const { w } = mountSlot()
    await flushPromises()
    await w.find('button.zy-slot-catalog-pricing__cta').trigger('click')
    expect(push).toHaveBeenLastCalledWith(
      `/auth/register?redirect=${encodeURIComponent('/app/checkout?product=p1')}`,
    )
    authState.isAuthenticated = true
    await w.find('button.zy-slot-catalog-pricing__cta').trigger('click')
    expect(push).toHaveBeenLastCalledWith('/app/checkout?product=p1')
  })

  it('contact CTA sets interest "Small Business · Tahunan" and scrolls to konsultasi', async () => {
    const sb = listing({
      code: 'sb',
      name: 'Small Business',
      variants: [
        variant({ product_id: 'sb-m', checkout_enabled: false }),
        variant({
          product_id: 'sb-y',
          billing_frequency: 'annual',
          price_with_tax: '1000000',
          checkout_enabled: false,
        }),
      ],
    })
    listListings.mockResolvedValue([category('c1', { listings: [sb] })])
    const { w, ctx } = mountSlot()
    await flushPromises()
    await w
      .findAll('[aria-pressed]')
      .find((b) => b.text().includes('Tahunan'))!
      .trigger('click')
    await w
      .find(
        '.zy-slot-catalog-pricing__card a.zy-slot-catalog-pricing__cta, .zy-slot-catalog-pricing__card button.zy-slot-catalog-pricing__cta',
      )
      .trigger('click')
    expect(ctx.interest.value).toBe('Small Business · Tahunan')
    expect(ctx.scrollToId).toHaveBeenCalledWith('konsultasi')
  })

  it('enterprise card uses its title as interest', async () => {
    listListings.mockResolvedValue([category('c1')])
    const { w, ctx } = mountSlot()
    await flushPromises()
    await w
      .find('.zy-slot-catalog-pricing__card--enterprise .zy-slot-catalog-pricing__cta')
      .trigger('click')
    expect(ctx.interest.value).toBe('Enterprise / Business')
    expect(ctx.scrollToId).toHaveBeenCalledWith('konsultasi')
  })

  it('shows error state with contact button when the API fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    listListings.mockRejectedValue(new Error('boom'))
    const { w, ctx } = mountSlot()
    await flushPromises()
    expect(w.text()).toContain('Harga belum dapat dimuat.')
    const btn = w.find('.zy-slot-catalog-pricing__error .zy-slot-catalog-pricing__cta')
    expect(btn.text()).toBe('Hubungi sales')
    await btn.trigger('click')
    expect(ctx.scrollToId).toHaveBeenCalledWith('konsultasi')
  })
})
