import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 't1' }, query: {} }),
}))

const get = vi.fn()
vi.mock('@/features/landing/shared/api/page-templates.api', () => ({
  pageTemplatesApi: { get: (...a: unknown[]) => get(...a) },
}))

const chromeLoad = vi.fn()
vi.mock('@/stores/landingChrome', () => ({
  useLandingChromeStore: () => ({
    load: () => chromeLoad(),
    canvasNav: [{ id: '1', label: 'Beranda', href: '/', target: 'self' }],
    canvasFooterNav: [],
    canvasBranding: { companyName: 'Klinik', logoUrl: '' },
  }),
}))

const pricingLoad = vi.fn()
let canvasPlans: unknown[] = []
vi.mock('@/stores/landingPricing', () => ({
  useLandingPricingStore: () => ({
    load: () => pricingLoad(),
    get canvasPlans() {
      return canvasPlans
    },
  }),
}))

vi.mock('@/stores/tenant.store', () => ({
  useTenantStore: () => ({ isPlatformOrganization: false }),
}))

import LandingTemplatePreviewPage from './LandingTemplatePreviewPage.vue'

const Renderer = {
  name: 'GrapesPageRenderer',
  props: ['html', 'css', 'chrome', 'title'],
  template: '<div class="renderer-stub" />',
}

function mountPage() {
  return mount(LandingTemplatePreviewPage, {
    global: { stubs: { GrapesPageRenderer: Renderer } },
  })
}

describe('LandingTemplatePreviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    canvasPlans = []
    chromeLoad.mockResolvedValue(undefined)
    pricingLoad.mockResolvedValue(undefined)
  })

  it('merender template dengan paket contoh bila tenant belum punya paket', async () => {
    get.mockResolvedValue({ id: 't1', name: 'Klinik', html: '<section>A</section>', css: '.a{}' })
    const w = mountPage()
    await flushPromises()
    const r = w.findComponent(Renderer)
    expect(get).toHaveBeenCalledWith('t1')
    expect(r.props('html')).toBe('<section>A</section>')
    expect(r.props('css')).toBe('.a{}')
    expect((r.props('chrome') as { pricingPlans: unknown[] }).pricingPlans).toHaveLength(3)
  })

  it('error 404 → pesan template tidak tersedia', async () => {
    get.mockRejectedValue({ response: { status: 404 } })
    const w = mountPage()
    await flushPromises()
    expect(w.text()).toContain('Template tidak lagi tersedia.')
    expect(w.findComponent(Renderer).exists()).toBe(false)
  })

  it('chrome gagal dimuat → renderer tetap dirender', async () => {
    get.mockResolvedValue({ id: 't1', name: 'K', html: '<p>x</p>', css: '' })
    chromeLoad.mockRejectedValue(new Error('boom'))
    pricingLoad.mockRejectedValue(new Error('boom'))
    const w = mountPage()
    await flushPromises()
    expect(w.findComponent(Renderer).exists()).toBe(true)
  })
})
