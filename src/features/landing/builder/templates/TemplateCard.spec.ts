import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import type {
  PageTemplateDetail,
  PageTemplateSummary,
} from '@/features/landing/shared/types/page-template.types'
import { createRenderQueue } from './gallery-logic'
import TemplateCard from './TemplateCard.vue'

let observerCallback: ((entries: { isIntersecting: boolean }[]) => void) | null = null

class FakeIntersectionObserver {
  constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
    observerCallback = cb
  }
  observe() {}
  disconnect() {}
}

const Renderer = {
  name: 'GrapesPageRenderer',
  props: { html: String, css: String, chrome: Object, title: String, static: Boolean },
  template: '<div class="renderer-stub" />',
}

const summary: PageTemplateSummary = {
  id: 't1',
  slug: 'klinik',
  name: 'Klinik',
  description: 'Template klinik',
  category: 'kesehatan',
  sort_order: 10,
  platform_only: false,
  updated_at: '',
}
const detail: PageTemplateDetail = { ...summary, html: '<section>A</section>', css: '.a{}' }

function mountCard(loadDetail: (id: string) => Promise<PageTemplateDetail>) {
  return mount(TemplateCard, {
    props: { template: summary, chrome: {}, queue: createRenderQueue(4), loadDetail },
    global: { stubs: { GrapesPageRenderer: Renderer } },
  })
}

describe('TemplateCard', () => {
  beforeEach(() => {
    observerCallback = null
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
      cb()
      return 0
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('tidak memuat detail sebelum kartu terlihat di viewport', async () => {
    const loadDetail = vi.fn().mockResolvedValue(detail)
    mountCard(loadDetail)
    await flushPromises()
    expect(loadDetail).not.toHaveBeenCalled()
  })

  it('memuat detail sekali saat terlihat dan merender thumbnail static', async () => {
    const loadDetail = vi.fn().mockResolvedValue(detail)
    const w = mountCard(loadDetail)
    observerCallback!([{ isIntersecting: true }])
    await flushPromises()
    expect(loadDetail).toHaveBeenCalledTimes(1)
    const r = w.findComponent(Renderer)
    expect(r.props('static')).toBe(true)
    expect(r.props('html')).toBe('<section>A</section>')
    expect(w.get('[inert]').attributes('aria-hidden')).toBe('true')
  })

  it('detail gagal → nama tetap tampil tanpa renderer; klik mencoba lagi', async () => {
    const loadDetail = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(detail)
    const w = mountCard(loadDetail)
    observerCallback!([{ isIntersecting: true }])
    await flushPromises()
    expect(w.findComponent(Renderer).exists()).toBe(false)
    expect(w.text()).toContain('Klinik')
    await w.trigger('click')
    await flushPromises()
    expect(loadDetail).toHaveBeenCalledTimes(2)
    expect(w.findComponent(Renderer).exists()).toBe(true)
    expect(w.emitted('open')).toHaveLength(1)
  })

  it('menampilkan label kategori dan deskripsi', () => {
    const w = mountCard(vi.fn())
    expect(w.text()).toContain('Kesehatan')
    expect(w.text()).toContain('Template klinik')
  })
})
