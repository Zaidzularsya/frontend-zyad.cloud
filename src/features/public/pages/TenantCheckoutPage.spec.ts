import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, reactive } from 'vue'

import type { PublicListingCategory } from '@/features/public/api/public-catalog.api'

const route = reactive<{ params: Record<string, string> }>({ params: { productId: 'p1' } })
const listCatalog = vi.fn()
const checkout = vi.fn()
const assign = vi.fn()
let onCredential: (credential: string) => void = () => {}

vi.mock('vue-router', () => ({
  useRoute: () => route,
  RouterLink: defineComponent({ template: '<a><slot /></a>' }),
}))
vi.mock('@/features/public/api/tenant-checkout.api', async () => {
  const actual = await vi.importActual<typeof import('./../api/tenant-checkout.api')>(
    '@/features/public/api/tenant-checkout.api',
  )
  return {
    ...actual,
    tenantCheckoutApi: {
      listCatalog: (...a: unknown[]) => listCatalog(...a),
      checkout: (...a: unknown[]) => checkout(...a),
    },
  }
})
vi.mock('@/features/public/composables/useGoogleCredential', () => ({
  useGoogleCredential: (opts: { onCredential: (c: string) => void }) => {
    onCredential = opts.onCredential
    return { googleEnabled: true, googleError: '' }
  },
}))

import TenantCheckoutPage from './TenantCheckoutPage.vue'

function catalog(checkoutEnabled = true): PublicListingCategory[] {
  return [
    {
      id: 'c1',
      name: 'Paket',
      position: 1,
      listings: [
        {
          code: 'basic',
          name: 'Basic',
          description: 'Paket dasar',
          order: 1,
          benefits: [{ label: '5 pengguna' }],
          variants: [
            {
              product_id: 'p1',
              sku: 'BASIC-M',
              charge_type: 'recurring',
              billing_frequency: 'monthly',
              payment_timing: 'prepaid',
              currency: 'IDR',
              base_price: '100000',
              tax_percent: '11',
              price_with_tax: '111000',
              checkout_enabled: checkoutEnabled,
            },
          ],
        },
      ],
    },
  ]
}

const apiError = (status: number, code = '') => ({ response: { status, data: { code } } })

async function mountReady() {
  const w = mount(TenantCheckoutPage)
  await flushPromises()
  return w
}

beforeEach(() => {
  route.params = { productId: 'p1' }
  listCatalog.mockReset().mockResolvedValue(catalog())
  checkout.mockReset()
  assign.mockReset()
  vi.stubGlobal('location', { ...window.location, assign })
})

describe('TenantCheckoutPage', () => {
  it('shows the product summary when checkout is enabled', async () => {
    const w = await mountReady()
    expect(w.text()).toContain('Basic')
    expect(w.find('[data-testid="google-button"]').exists()).toBe(true)
  })

  it('unknown product -> unavailable state, no google button', async () => {
    route.params = { productId: 'nope' }
    const w = await mountReady()
    expect(w.find('[data-testid="checkout-unavailable"]').exists()).toBe(true)
    expect(w.find('[data-testid="google-button"]').exists()).toBe(false)
  })

  it('checkout_enabled=false -> unavailable state', async () => {
    listCatalog.mockResolvedValue(catalog(false))
    const w = await mountReady()
    expect(w.find('[data-testid="checkout-unavailable"]').exists()).toBe(true)
  })

  it('catalog load failure -> unavailable state', async () => {
    listCatalog.mockRejectedValue(apiError(404))
    const w = await mountReady()
    expect(w.find('[data-testid="checkout-unavailable"]').exists()).toBe(true)
  })

  it('google credential posts credential + product_id and redirects to invoice_url', async () => {
    checkout.mockResolvedValue({ invoice_url: 'https://pay.example/i/abc' })
    await mountReady()
    onCredential('g-token')
    await flushPromises()
    expect(checkout).toHaveBeenCalledWith('g-token', 'p1')
    expect(assign).toHaveBeenCalledWith('https://pay.example/i/abc')
  })

  it('409 in progress -> retry message', async () => {
    checkout.mockRejectedValue(apiError(409, 'SELF_SERVE_IN_PROGRESS'))
    const w = await mountReady()
    onCredential('t')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toContain('Sedang diproses, coba lagi sesaat')
    expect(assign).not.toHaveBeenCalled()
  })

  it('409 already subscribed and linked conflicts map to distinct neutral messages', async () => {
    checkout.mockRejectedValue(apiError(409, 'SELF_SERVE_ALREADY_SUBSCRIBED'))
    const w = await mountReady()
    onCredential('t')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toContain('Anda sudah berlangganan paket ini')
    checkout.mockRejectedValue(apiError(409, 'COMPANY_ALREADY_LINKED'))
    onCredential('t')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toContain('hubungi penjual')
  })

  it('429 -> rate limit message', async () => {
    checkout.mockRejectedValue(apiError(429))
    const w = await mountReady()
    onCredential('t')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toContain('Terlalu banyak percobaan')
  })

  it('502 -> try again message; 401 -> verification message', async () => {
    checkout.mockRejectedValue(apiError(502, 'SELF_SERVE_STEP_FAILED'))
    const w = await mountReady()
    onCredential('t')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toContain('Coba lagi')
    checkout.mockRejectedValue(apiError(401))
    onCredential('t')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toContain('Verifikasi akun Google')
  })

  it('blocks double submit while pending', async () => {
    let resolve!: (v: { invoice_url: string }) => void
    checkout.mockReturnValue(new Promise((r) => (resolve = r)))
    const w = await mountReady()
    onCredential('t')
    onCredential('t')
    await flushPromises()
    expect(checkout).toHaveBeenCalledTimes(1)
    expect(w.find('[data-testid="google-button"]').attributes('aria-busy')).toBe('true')
    resolve({ invoice_url: '/i/x' })
    await flushPromises()
    expect(assign).toHaveBeenCalledWith(`${window.location.origin}/i/x`)
  })

  it.each([
    '/\\evil.com',
    '//evil.com',
    'javascript:alert(1)',
    'https://user:pw@host.example/',
    '/\t/evil.com',
    '/\n/evil.com',
    ' //evil.com',
    '\t//evil.com',
    'java\nscript:alert(1)',
  ])('refuses unsafe invoice_url %s', async (url) => {
    checkout.mockResolvedValue({ invoice_url: url })
    const w = await mountReady()
    onCredential('t')
    await flushPromises()
    expect(assign).not.toHaveBeenCalled()
    expect(w.find('[role="alert"]').exists()).toBe(true)
  })

  it('allows a relative path (resolved to current origin) and a normal https URL', async () => {
    checkout.mockResolvedValue({ invoice_url: '/pay/x' })
    await mountReady()
    onCredential('t')
    await flushPromises()
    expect(assign).toHaveBeenLastCalledWith(`${window.location.origin}/pay/x`)

    checkout.mockResolvedValue({ invoice_url: 'https://pay.example/i/abc' })
    await mountReady()
    onCredential('t')
    await flushPromises()
    expect(assign).toHaveBeenLastCalledWith('https://pay.example/i/abc')
  })

  it('reloads the product when the productId route param changes', async () => {
    listCatalog.mockResolvedValue([
      ...catalog(),
      {
        ...catalog()[0]!,
        id: 'c2',
        listings: [
          {
            ...catalog()[0]!.listings[0]!,
            name: 'Pro',
            variants: [{ ...catalog()[0]!.listings[0]!.variants[0]!, product_id: 'p2' }],
          },
        ],
      },
    ])
    const w = await mountReady()
    expect(w.text()).toContain('Basic')
    route.params = { productId: 'p2' }
    await flushPromises()
    expect(w.text()).toContain('Pro')
  })
})
