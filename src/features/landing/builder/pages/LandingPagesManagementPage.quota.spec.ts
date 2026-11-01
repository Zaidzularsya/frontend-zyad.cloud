import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'

const api = vi.hoisted(() => ({
  getPages: vi.fn(),
  updatePage: vi.fn(),
  createPage: vi.fn(),
  duplicatePage: vi.fn(),
  deletePage: vi.fn(),
  archivePage: vi.fn(),
}))
const summary = vi.hoisted(() => vi.fn())
const push = vi.hoisted(() => vi.fn())

vi.mock('@/features/landing/shared/api/landing.api', () => ({ landingApi: api }))
vi.mock('@/features/entitlements/api/entitlements.api', () => ({ entitlementsApi: { summary } }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'landing-pages', query: {}, fullPath: '/' }),
  useRouter: () => ({ push, resolve: vi.fn() }),
}))
vi.mock('@/features/landing/builder/composables/usePageSelection', async () => {
  const { ref } = await import('vue')
  return { usePageSelection: () => ({ selectedPageId: ref('') }) }
})

import LandingPagesManagementPage from './LandingPagesManagementPage.vue'

const quota = (atLimit: boolean) => [
  {
    feature_key: 'landing.max_pages',
    module: 'landing',
    name: 'Maks. page',
    state: 'quota',
    limit: 3,
    used: atLimit ? 3 : 1,
    remaining: atLimit ? 0 : 2,
    reset_strategy: 'never',
    at_limit: atLimit,
  },
]

const existing = {
  id: 'p1',
  name: 'Public Marketing',
  title: 'Public Marketing',
  slug: 'public-marketing',
  page_type: 'landing',
  status: 'draft',
  visibility: 'public',
  locale: 'id-ID',
  timezone: 'Asia/Jakarta',
  is_homepage: false,
  is_template: false,
  seo: {},
  updated_at: '2026-10-07T03:00:00Z',
}

// pagePanelRef pada halaman menunjuk ke instance BaseCard (bukan elemen), jadi
// scrollIntoView tidak ada; stub mengeksposnya agar test tidak melempar error async.
const BaseCardStub = defineComponent({
  setup(_, { slots, expose }) {
    expose({ scrollIntoView: vi.fn() })
    return () => h('section', slots.default?.())
  },
})

async function mountPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const spy = vi.spyOn(client, 'invalidateQueries')
  const w = mount(LandingPagesManagementPage, {
    global: {
      plugins: [[VueQueryPlugin, { queryClient: client }]],
      stubs: { BaseCard: BaseCardStub },
    },
  })
  await flushPromises()
  return { w, spy }
}

// Halaman memakai auth store (gerbang tombol aktivasi).
beforeEach(() => setActivePinia(createPinia()))

describe('LandingPagesManagementPage quota', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Element.prototype.scrollIntoView = vi.fn()
    api.getPages.mockResolvedValue({ data: [existing] })
  })

  it('shows banner and upgrade button when landing page quota is full', async () => {
    summary.mockResolvedValue(quota(true))
    const { w } = await mountPage()
    expect(w.get('[role="status"]').text()).toContain('Kuota landing page')
    expect(w.text()).not.toContain('Create Page')
    await w
      .findAll('button')
      .find((b) => b.text() === 'Upgrade untuk tambah page')!
      .trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'billing' })
  })

  it('keeps list and manage available when quota is full', async () => {
    summary.mockResolvedValue(quota(true))
    const { w } = await mountPage()
    expect(w.text()).toContain('Public Marketing')
    expect(w.findAll('button').some((b) => b.text() === 'Kelola')).toBe(true)
  })

  it('shows normal create button when room', async () => {
    summary.mockResolvedValue(quota(false))
    const { w } = await mountPage()
    expect(w.find('[role="status"]').exists()).toBe(false)
    expect(w.text()).toContain('Create Page')
  })

  it('shows the quota message and refreshes entitlements on a 409 create', async () => {
    summary.mockResolvedValue(quota(false))
    api.createPage.mockRejectedValue({
      response: { status: 409, data: { code: 'QUOTA_EXCEEDED', message: 'x' } },
    })
    const { w, spy } = await mountPage()
    await w
      .findAll('button')
      .find((b) => b.text().includes('Create Page'))!
      .trigger('click')
    await flushPromises()
    await w.get('input[placeholder="Zyad Cloud Company Profile"]').setValue('Baru')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Kuota landing page paket Anda sudah penuh')
    const calls = spy.mock.calls.filter(
      ([f]) => (f as { queryKey?: unknown[] })?.queryKey?.[0] === 'entitlements',
    )
    expect(calls.length).toBeGreaterThan(0)
  })

  describe('duplicate', () => {
    const entitlementCalls = (spy: { mock: { calls: unknown[][] } }) =>
      spy.mock.calls.filter(
        ([f]) => (f as { queryKey?: unknown[] })?.queryKey?.[0] === 'entitlements',
      )
    const dup = (w: ReturnType<typeof mount>) =>
      w.findAll('button').find((b) => b.text().includes('Duplicate'))!

    beforeEach(() => vi.spyOn(window, 'confirm').mockReturnValue(true))

    it('is disabled with an explanation when quota is full while edit stays available', async () => {
      summary.mockResolvedValue(quota(true))
      const { w } = await mountPage()
      expect(dup(w).attributes('disabled')).toBeDefined()
      expect(dup(w).attributes('title')).toContain('Kuota landing page penuh')
      expect(w.findAll('button').some((b) => b.text() === 'Kelola')).toBe(true)
    })

    it('duplicates when there is room and refreshes entitlements', async () => {
      summary.mockResolvedValue(quota(false))
      api.duplicatePage.mockResolvedValue({ data: existing })
      const { w, spy } = await mountPage()
      await dup(w).trigger('click')
      await flushPromises()
      expect(api.duplicatePage).toHaveBeenCalledTimes(1)
      expect(entitlementCalls(spy).length).toBeGreaterThan(0)
    })

    it('shows the quota message and refreshes entitlements on a 409', async () => {
      summary.mockResolvedValue(quota(false))
      api.duplicatePage.mockRejectedValue({
        response: { status: 409, data: { code: 'QUOTA_EXCEEDED', message: 'x' } },
      })
      const { w, spy } = await mountPage()
      await dup(w).trigger('click')
      await flushPromises()
      expect(w.text()).toContain('Kuota landing page paket Anda sudah penuh')
      expect(entitlementCalls(spy).length).toBeGreaterThan(0)
    })

    it.each([
      ['Delete', 'deletePage'],
      ['Archive', 'archivePage'],
    ] as const)('%s frees quota, so it refreshes entitlements', async (label, method) => {
      summary.mockResolvedValue(quota(true))
      api[method].mockResolvedValue(null)
      const { w, spy } = await mountPage()
      await w
        .findAll('button')
        .find((b) => b.text().includes(label))!
        .trigger('click')
      await flushPromises()
      expect(api[method]).toHaveBeenCalledTimes(1)
      expect(entitlementCalls(spy).length).toBeGreaterThan(0)
    })
  })
})
