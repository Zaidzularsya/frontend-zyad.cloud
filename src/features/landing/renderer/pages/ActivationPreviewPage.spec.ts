import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const httpGet = vi.fn()
vi.mock('@/lib/http', () => ({ http: { get: (...a: unknown[]) => httpGet(...a) } }))
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { token: 'tok/A+1' } }) }))

import ActivationPreviewPage from './ActivationPreviewPage.vue'

const stubs = {
  GrapesPageRenderer: {
    name: 'GrapesPageRenderer',
    props: ['html', 'css', 'title'],
    template: '<div class="stub-frame" :data-html="html" />',
  },
  LandingPageRenderer: { name: 'LandingPageRenderer', template: '<div class="stub-renderer" />' },
}

describe('ActivationPreviewPage', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => document.head.querySelectorAll('meta[name="robots"]').forEach((m) => m.remove()))

  it('memuat API pratinjau dengan token dan merender halaman dengan banner + noindex', async () => {
    httpGet.mockResolvedValue({
      data: {
        data: {
          Builder: 'grapesjs',
          HTML: '<h1>Undangan Budi</h1>',
          CSS: '',
          Page: { id: 'p1', title: 'Undangan Budi', slug: 'undangan-budi', seo: {} },
        },
      },
    })
    const wrapper = mount(ActivationPreviewPage, { global: { stubs } })
    await flushPromises()

    expect(httpGet).toHaveBeenCalledWith('/public/landing/preview/tok%2FA%2B1')
    expect(wrapper.find('.stub-frame').attributes('data-html')).toBe('<h1>Undangan Budi</h1>')
    expect(wrapper.find('[data-testid="preview-banner"]').text()).toContain('Pratinjau')
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    )
    wrapper.unmount()
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull()
  })

  it('404 → status netral kedaluwarsa, tanpa mencatat token', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    httpGet.mockRejectedValue({
      response: { status: 404 },
      config: { url: '/public/landing/preview/tok%2FA%2B1' },
    })
    const wrapper = mount(ActivationPreviewPage, { global: { stubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('Pratinjau tidak tersedia atau sudah kedaluwarsa.')
    expect(wrapper.find('.stub-frame').exists()).toBe(false)
    expect(wrapper.find('.stub-renderer').exists()).toBe(false)
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('tok')
    consoleError.mockRestore()
  })
})
