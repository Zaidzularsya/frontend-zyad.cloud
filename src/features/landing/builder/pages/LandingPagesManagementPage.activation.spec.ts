import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const api = vi.hoisted(() => ({ getPages: vi.fn() }))
const summary = vi.hoisted(() => vi.fn())
const createInvoice = vi.hoisted(() => vi.fn())

vi.mock('@/features/landing/shared/api/landing.api', () => ({ landingApi: api }))
vi.mock('@/features/entitlements/api/entitlements.api', () => ({
  entitlementsApi: { summary },
}))
vi.mock('@/features/landing/activation/api/activation.api', () => ({
  activationApi: { createInvoice },
}))
vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'landing-pages', query: {}, fullPath: '/' }),
  useRouter: () => ({ push: vi.fn(), resolve: vi.fn() }),
}))
vi.mock('@/features/landing/builder/composables/usePageSelection', async () => {
  const { ref } = await import('vue')
  return { usePageSelection: () => ({ selectedPageId: ref('') }) }
})

import LandingPagesManagementPage from './LandingPagesManagementPage.vue'

const entitled = {
  feature_key: 'landing.page_activation',
  module: 'landing',
  name: 'Aktivasi halaman',
  state: 'unlimited',
  reset_strategy: 'never',
  at_limit: false,
}

function page(over: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    name: 'Undangan',
    title: 'Undangan',
    slug: 'undangan',
    page_type: 'homepage',
    builder: 'grapesjs',
    status: 'draft',
    visibility: 'public',
    locale: 'id-ID',
    timezone: 'Asia/Jakarta',
    is_homepage: false,
    is_template: false,
    seo: {},
    updated_at: '2026-10-07T03:00:00Z',
    ...over,
  }
}

async function mountPage(pages: Array<Record<string, unknown>>) {
  api.getPages.mockResolvedValue({ data: pages })
  const wrapper = mount(LandingPagesManagementPage, {
    global: {
      plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]],
      stubs: { PageHeader: true, teleport: true },
    },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

const buttonByText = (w: ReturnType<typeof mount>, text: string) =>
  w.findAll('button').find((b) => b.text() === text)

beforeEach(() => {
  api.getPages.mockReset()
  summary.mockReset()
  createInvoice.mockReset()
  summary.mockResolvedValue([entitled])
})

describe('LandingPagesManagementPage activation', () => {
  it('hides Create invoice without the entitlement', async () => {
    summary.mockResolvedValue([{ ...entitled, state: 'hidden' }])
    const w = await mountPage([page()])
    expect(buttonByText(w, 'Create invoice')).toBeUndefined()
  })

  it('hides Create invoice when the feature is absent from the summary', async () => {
    summary.mockResolvedValue([])
    const w = await mountPage([page()])
    expect(buttonByText(w, 'Create invoice')).toBeUndefined()
  })

  it('hides Create invoice while the summary is loading (fail-closed)', async () => {
    summary.mockReturnValue(new Promise(() => {}))
    const w = await mountPage([page()])
    expect(buttonByText(w, 'Create invoice')).toBeUndefined()
  })

  it('hides Create invoice when the summary request fails', async () => {
    summary.mockRejectedValue(new Error('boom'))
    const w = await mountPage([page()])
    expect(buttonByText(w, 'Create invoice')).toBeUndefined()
  })

  it('shows the button on a grapesjs row and opens the dialog with 1 jam default', async () => {
    const w = await mountPage([page()])
    await buttonByText(w, 'Create invoice')!.trigger('click')
    await flushPromises()
    expect((w.get('input[name="due_value"]').element as HTMLInputElement).value).toBe('1')
    expect((w.get('select[name="due_unit"]').element as HTMLSelectElement).value).toBe('hour')
  })

  it('has no button on legacy sections pages or templates', async () => {
    const w = await mountPage([
      page({ id: 'a', builder: 'sections' }),
      page({ id: 'b', is_template: true }),
    ])
    // Template difilter pada loadPages; halaman legacy tetap tampil tanpa tombol.
    expect(buttonByText(w, 'Create invoice')).toBeUndefined()
  })

  it('shows badges for preview, publish and expired; none shows nothing', async () => {
    const w = await mountPage([
      page({ id: '1', slug: 'a', title: 'A', activation_state: 'none' }),
      page({
        id: '2',
        slug: 'b',
        title: 'B',
        activation_state: 'preview',
        open_activation: {
          id: 'x',
          buyer_name: 'B',
          price: '1',
          invoice_due_at: '2026-10-25T03:00:00Z',
        },
      }),
      page({
        id: '3',
        slug: 'c',
        title: 'C',
        activation_state: 'publish',
        active_until: '2026-11-25T03:00:00Z',
      }),
      page({ id: '4', slug: 'd', title: 'D', activation_state: 'expired' }),
    ])
    const text = w.text()
    expect(text).toContain('Preview — menunggu pembayaran sampai 25 Okt 2026 10.00 WIB')
    expect(text).toContain('Terbit sampai 25 Nov 2026 10.00 WIB')
    expect(text).toContain('Kedaluwarsa')
    expect(w.findAll('[data-testid="activation-badge"]')).toHaveLength(3)
  })

  it('labels the button Perpanjang when expired', async () => {
    const w = await mountPage([page({ activation_state: 'expired' })])
    expect(buttonByText(w, 'Perpanjang')).toBeDefined()
    expect(buttonByText(w, 'Create invoice')).toBeUndefined()
  })

  it('reloads the pages after a successful invoice', async () => {
    createInvoice.mockResolvedValue({
      activation: { id: 'a1', invoice_due_at: '2026-10-25T03:00:00Z' },
      preview_url: 'u',
      payment_url: 'p',
    })
    const w = await mountPage([page()])
    await buttonByText(w, 'Create invoice')!.trigger('click')
    await w.get('input[name="buyer_name"]').setValue('Budi')
    await w.get('input[name="buyer_contact"]').setValue('0812')
    await w.get('input[name="price"]').setValue('150000')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(createInvoice).toHaveBeenCalledTimes(1)
    expect(api.getPages).toHaveBeenCalledTimes(2)
  })
})
