import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import type { PageTemplateSummary } from '@/features/landing/shared/types/page-template.types'

const list = vi.fn()
const get = vi.fn()
vi.mock('@/features/landing/shared/api/page-templates.api', () => ({
  pageTemplatesApi: { list: () => list(), get: (id: string) => get(id) },
}))
vi.mock('@/stores/landingChrome', () => ({
  useLandingChromeStore: () => ({
    load: vi.fn(),
    canvasNav: [],
    canvasFooterNav: [],
    canvasBranding: { companyName: '', logoUrl: '' },
  }),
}))
vi.mock('@/stores/landingPricing', () => ({
  useLandingPricingStore: () => ({ load: vi.fn(), canvasPlans: [] }),
}))
vi.mock('@/stores/tenant.store', () => ({
  useTenantStore: () => ({ isPlatformOrganization: false }),
}))

class FakeIO {
  observe() {}
  disconnect() {}
}

import TemplateGalleryDialog from './TemplateGalleryDialog.vue'

const tpl = (over: Partial<PageTemplateSummary>): PageTemplateSummary => ({
  id: 'a',
  slug: 'a',
  name: 'A',
  description: '',
  category: 'dasar',
  sort_order: 1,
  platform_only: false,
  updated_at: '',
  ...over,
})

const TemplateCardStub = {
  name: 'TemplateCard',
  props: ['template', 'chrome', 'queue', 'loadDetail'],
  emits: ['open'],
  template:
    '<div class="card-stub" :data-id="template.id" @click="$emit(\'open\', template)">{{ template.name }}</div>',
}
const PreviewStub = {
  name: 'TemplatePreviewPane',
  props: ['template', 'busy'],
  emits: ['back', 'use'],
  template:
    '<div class="preview-stub"><button class="use" @click="$emit(\'use\', template)">use</button></div>',
}

function mountDialog() {
  return mount(TemplateGalleryDialog, {
    props: { open: true },
    attachTo: document.body,
    global: {
      stubs: { TemplateCard: TemplateCardStub, TemplatePreviewPane: PreviewStub, Teleport: true },
    },
  })
}

const items = [
  tpl({ id: 'k', name: 'Klinik', category: 'kesehatan' }),
  tpl({ id: 'r', name: 'Restoran Kopi', category: 'kuliner' }),
]

describe('TemplateGalleryDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('IntersectionObserver', FakeIO)
    setActivePinia(createPinia())
    list.mockResolvedValue(items)
  })

  it('kartu pertama selalu "Mulai dari kosong"', async () => {
    const w = mountDialog()
    await flushPromises()
    const grid = w.get('.grid')
    expect(grid.element.firstElementChild!.textContent).toContain('Mulai dari kosong')
    expect(w.findAll('.card-stub')).toHaveLength(2)
  })

  it('chip hanya kategori yang ada, diawali "Semua"', async () => {
    const w = mountDialog()
    await flushPromises()
    const chips = w.findAll('[aria-label="Kategori template"] button').map((b) => b.text())
    expect(chips).toEqual(['Semua', 'Kesehatan', 'Kuliner'])
  })

  it('mengetik di kotak cari menyaring kartu', async () => {
    const w = mountDialog()
    await flushPromises()
    await w.get('input[type="search"]').setValue('kopi')
    expect(w.findAll('.card-stub').map((c) => c.text())).toEqual(['Restoran Kopi'])
  })

  it('list gagal → pesan error + Coba lagi; "Mulai dari kosong" tetap bisa dipakai', async () => {
    list.mockRejectedValueOnce(new Error('x'))
    const w = mountDialog()
    await flushPromises()
    expect(w.text()).toContain('Galeri belum dapat dimuat.')
    await w.get('.grid button').trigger('click')
    const payload = w.emitted('apply')![0]![0] as { name: string; html: string; css: string }
    expect(payload.name).toBe('Kosong')
    expect(payload.html).toContain('Bagian pertama')

    await w
      .findAll('button')
      .find((b) => b.text() === 'Coba lagi')!
      .trigger('click')
    await flushPromises()
    expect(list).toHaveBeenCalledTimes(2)
    expect(w.text()).not.toContain('Galeri belum dapat dimuat.')
  })

  it('klik kartu membuka preview; Gunakan mengirim apply dengan html dari detail', async () => {
    get.mockResolvedValue({ ...items[0], html: '<section>K</section>', css: '.k{}' })
    const w = mountDialog()
    await flushPromises()
    await w.get('.card-stub[data-id="k"]').trigger('click')
    expect(w.find('.preview-stub').exists()).toBe(true)
    await w.get('.use').trigger('click')
    await flushPromises()
    expect(w.emitted('apply')![0]![0]).toEqual({
      name: 'Klinik',
      html: '<section>K</section>',
      css: '.k{}',
    })
  })

  it('404 saat Gunakan → pesan tidak tersedia dan daftar dimuat ulang', async () => {
    get.mockRejectedValue({ response: { status: 404 } })
    const w = mountDialog()
    await flushPromises()
    await w.get('.card-stub[data-id="k"]').trigger('click')
    await w.get('.use').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Template tidak lagi tersedia.')
    expect(list).toHaveBeenCalledTimes(2)
    expect(w.find('.preview-stub').exists()).toBe(false)
    expect(w.emitted('apply')).toBeUndefined()
  })
})
