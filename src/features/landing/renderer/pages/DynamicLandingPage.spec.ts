import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const httpGet = vi.fn()
vi.mock('@/lib/http', () => ({ http: { get: (...a: unknown[]) => httpGet(...a) } }))
vi.mock('vue-router', () => ({ useRoute: () => ({ params: {} }) }))

import DynamicLandingPage from './DynamicLandingPage.vue'

const stubs = {
  GrapesPageRenderer: {
    name: 'GrapesPageRenderer',
    props: ['html', 'css', 'title'],
    template: '<div class="stub-frame" :data-html="html" :data-css="css" />',
  },
  LandingPageRenderer: { name: 'LandingPageRenderer', template: '<div class="stub-renderer" />' },
}

function resolveWith(data: Record<string, unknown>) {
  httpGet.mockResolvedValue({ data: { data } })
}

describe('DynamicLandingPage — GrapesJS branch', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders GrapesPageRenderer with html/css for a grapesjs page', async () => {
    resolveWith({
      Builder: 'grapesjs',
      HTML: '<h1>Halo</h1>',
      CSS: 'h1{color:red}',
      Page: { id: 'p1', title: 'Halo', slug: 'halo', seo: {} },
      Menus: [],
      Branding: {},
    })

    const wrapper = mount(DynamicLandingPage, { props: { slug: 'halo' }, global: { stubs } })
    await flushPromises()

    const frame = wrapper.find('.stub-frame')
    expect(frame.exists()).toBe(true)
    expect(frame.attributes('data-html')).toBe('<h1>Halo</h1>')
    expect(frame.attributes('data-css')).toBe('h1{color:red}')
    expect(wrapper.find('.stub-renderer').exists()).toBe(false)
  })

  it('emits header-mode "section" for a grapesjs page so the layout nav is hidden', async () => {
    resolveWith({
      Builder: 'grapesjs',
      HTML: '<p>x</p>',
      CSS: '',
      Page: { id: 'p1', title: 'X', slug: 'x', seo: {} },
    })

    const wrapper = mount(DynamicLandingPage, { props: { slug: 'x' }, global: { stubs } })
    await flushPromises()

    expect(wrapper.emitted('landing-header-mode')?.at(-1)).toEqual(['section'])
  })

  it('still renders the section renderer for a sections page', async () => {
    resolveWith({
      Builder: 'sections',
      Page: { id: 'p1', title: 'S', slug: 's' },
      Sections: [],
      Menus: [],
      Branding: {},
    })

    const wrapper = mount(DynamicLandingPage, { props: { slug: 's' }, global: { stubs } })
    await flushPromises()

    expect(wrapper.find('.stub-renderer').exists()).toBe(true)
    expect(wrapper.find('.stub-frame').exists()).toBe(false)
  })
})

describe('DynamicLandingPage — home mode', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls resolve?home=1 when home is set', async () => {
    resolveWith({
      Builder: 'sections',
      Page: { id: 'p1', title: 'H', slug: 'beranda' },
      Sections: [],
    })
    mount(DynamicLandingPage, { props: { home: true }, global: { stubs } })
    await flushPromises()

    expect(httpGet).toHaveBeenCalledTimes(1)
    expect(httpGet).toHaveBeenCalledWith('/public/landing/resolve?home=1')
  })

  it('home wins over slug', async () => {
    resolveWith({
      Builder: 'sections',
      Page: { id: 'p1', title: 'H', slug: 'beranda' },
      Sections: [],
    })
    mount(DynamicLandingPage, {
      props: { home: true, slug: 'public-marketing' },
      global: { stubs },
    })
    await flushPromises()

    expect(httpGet).toHaveBeenCalledWith('/public/landing/resolve?home=1')
  })

  it('keeps slug and host-based resolve unchanged when home is not set', async () => {
    resolveWith({ Builder: 'sections', Page: { id: 'p1', title: 'S', slug: 's' }, Sections: [] })
    mount(DynamicLandingPage, { props: { slug: 's' }, global: { stubs } })
    await flushPromises()
    expect(httpGet).toHaveBeenLastCalledWith('/public/landing/resolve?slug=s')

    mount(DynamicLandingPage, { props: { home: false }, global: { stubs } })
    await flushPromises()
    expect(httpGet).toHaveBeenLastCalledWith('/public/landing/resolve')
  })

  it('shows the error state when home resolve fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    httpGet.mockRejectedValue(new Error('404'))
    const wrapper = mount(DynamicLandingPage, { props: { home: true }, global: { stubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('Halaman tidak tersedia')
    spy.mockRestore()
  })
})
