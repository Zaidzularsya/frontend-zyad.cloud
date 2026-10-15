import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const api = vi.hoisted(() => ({
  getPages: vi.fn(),
  updatePage: vi.fn(),
  createPage: vi.fn(),
}))

vi.mock('@/features/landing/shared/api/landing.api', () => ({ landingApi: api }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'landing-pages', query: {}, fullPath: '/' }),
  useRouter: () => ({ push: vi.fn(), resolve: vi.fn() }),
}))
vi.mock('@/features/landing/builder/composables/usePageSelection', async () => {
  const { ref } = await import('vue')
  return { usePageSelection: () => ({ selectedPageId: ref('') }) }
})

import LandingPagesManagementPage from './LandingPagesManagementPage.vue'

function page(over: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    name: 'Public Marketing',
    title: 'Public Marketing',
    slug: 'public-marketing',
    page_type: 'homepage',
    status: 'published',
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

async function openManage(pages: Array<Record<string, unknown>>) {
  api.getPages.mockResolvedValue({ data: pages })
  api.updatePage.mockResolvedValue({ data: pages[0] })
  const wrapper = mount(LandingPagesManagementPage, { global: { stubs: { PageHeader: true } } })
  await flushPromises()
  const kelola = wrapper.findAll('button').find((b) => b.text() === 'Kelola')!
  await kelola.trigger('click')
  await flushPromises()
  return wrapper
}

function homepageCheckbox(wrapper: ReturnType<typeof mount>) {
  const label = wrapper.findAll('label').find((l) => l.text().includes('Set as homepage'))!
  return label.find('input[type="checkbox"]')
}

describe('LandingPagesManagementPage - is_homepage pada edit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('menyimpan ulang halaman page_type=homepage non-beranda tidak mengirim is_homepage', async () => {
    const wrapper = await openManage([
      page(),
      page({ id: 'p2', slug: 'beranda', is_homepage: true }),
    ])
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(api.updatePage).toHaveBeenCalledTimes(1)
    expect(api.updatePage.mock.calls[0]![1]).not.toHaveProperty('is_homepage')
  })

  it('checkbox menampilkan nilai awal dari data halaman', async () => {
    const wrapper = await openManage([page({ is_homepage: true })])
    expect((homepageCheckbox(wrapper).element as HTMLInputElement).checked).toBe(true)
  })

  it('mengubah checkbox mengirim is_homepage setelah konfirmasi', async () => {
    const wrapper = await openManage([
      page(),
      page({ id: 'p2', slug: 'beranda', is_homepage: true }),
    ])
    await homepageCheckbox(wrapper).setValue(true)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(window.confirm).toHaveBeenCalledWith(
      'Halaman ini akan menjadi beranda dan menggantikan beranda saat ini.',
    )
    expect(api.updatePage.mock.calls[0]![1]).toMatchObject({ is_homepage: true })
  })

  it('batal konfirmasi tidak menyimpan', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const wrapper = await openManage([
      page(),
      page({ id: 'p2', slug: 'beranda', is_homepage: true }),
    ])
    await homepageCheckbox(wrapper).setValue(true)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(api.updatePage).not.toHaveBeenCalled()
  })
})
