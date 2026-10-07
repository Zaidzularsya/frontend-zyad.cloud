import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: {}, query: { pageId: 'p1', mode: 'draft' } }),
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('@/lib/http', () => ({ http: { get: vi.fn() } }))

const getPage = vi.fn()
const getDocument = vi.fn()
const getForms = vi.fn()
vi.mock('@/features/landing/shared/api/landing.api', () => ({
  landingApi: {
    getPage: (...a: unknown[]) => getPage(...a),
    getDocument: (...a: unknown[]) => getDocument(...a),
    getForms: (...a: unknown[]) => getForms(...a),
  },
}))

import LandingPreviewPage from './LandingPreviewPage.vue'

describe('LandingPreviewPage — forms di preview admin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    getPage.mockResolvedValue({ data: { id: 'p1', title: 'T', builder: 'grapesjs' } })
    getDocument.mockResolvedValue({ data: { html: '<div></div>', css: '' } })
  })

  it('memuat form aktif beserta field-nya (urut sort_order) ke chrome.forms', async () => {
    getForms.mockResolvedValue({
      data: [
        {
          id: 'f1',
          is_active: true,
          submit_label: 'Kirim',
          success_message: 'Terima kasih',
          redirect_url: null,
          fields: [
            { key: 'email', type: 'email', label: 'Email', required: true, sort_order: 2 },
            { key: 'name', type: 'text', label: 'Nama', required: true, sort_order: 1 },
          ],
        },
        { id: 'f2', is_active: false, submit_label: 'x', success_message: '', fields: [] },
      ],
    })
    const wrapper = mount(LandingPreviewPage, {
      global: {
        stubs: {
          GrapesPageRenderer: {
            name: 'GrapesPageRenderer',
            props: ['html', 'css', 'chrome'],
            template: '<div />',
          },
          LandingPageRenderer: true,
          BaseButton: true,
        },
      },
    })
    await flushPromises()
    const renderer = wrapper.findComponent({ name: 'GrapesPageRenderer' })
    const chrome = renderer.props('chrome') as { forms: Array<{ id: string; fields: unknown[] }> }
    expect(chrome.forms.map((f) => f.id)).toEqual(['f1'])
    expect(chrome.forms[0]!.fields).toEqual([
      { key: 'name', type: 'text', label: 'Nama', placeholder: '', options: [], required: true },
      { key: 'email', type: 'email', label: 'Email', placeholder: '', options: [], required: true },
    ])
  })
})
