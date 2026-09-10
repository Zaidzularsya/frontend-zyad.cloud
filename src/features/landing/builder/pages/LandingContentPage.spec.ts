import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'

const selection = {
  pages: ref<Array<Record<string, unknown>>>([]),
  selectedPageId: ref(''),
  errorMessage: ref(''),
  loadPages: vi.fn(),
}

vi.mock('@/features/landing/builder/composables/usePageSelection', () => ({
  usePageSelection: () => selection,
}))
vi.mock('@/features/landing/builder/grapes/GrapesEditor.vue', () => ({
  __esModule: true,
  default: {
    name: 'GrapesEditorStub',
    props: { pageId: { type: String, default: '' } },
    template: '<div class="stub-grapes">{{ pageId }}</div>',
  },
}))
vi.mock('./LegacySectionBuilderPage.vue', () => ({
  __esModule: true,
  default: { name: 'LegacyBuilderStub', template: '<div class="stub-legacy" />' },
}))

import LandingContentPage from './LandingContentPage.vue'

function page(over: Record<string, unknown> = {}) {
  return { id: 'p1', name: 'Home', title: 'Home', slug: 'home', builder: 'grapesjs', ...over }
}

describe('LandingContentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selection.pages.value = []
    selection.selectedPageId.value = ''
    selection.errorMessage.value = ''
  })

  it('loads the page list on mount', () => {
    mount(LandingContentPage)
    expect(selection.loadPages).toHaveBeenCalledTimes(1)
  })

  it('mounts the GrapesJS editor for a grapesjs page', async () => {
    selection.pages.value = [page()]
    selection.selectedPageId.value = 'p1'
    const wrapper = mount(LandingContentPage)
    await flushPromises()
    expect(wrapper.find('.stub-grapes').exists()).toBe(true)
    expect(wrapper.find('.stub-grapes').text()).toBe('p1')
    expect(wrapper.find('.stub-legacy').exists()).toBe(false)
  })

  it('delegates to the legacy section builder for a sections page', async () => {
    selection.pages.value = [page({ builder: 'sections' })]
    selection.selectedPageId.value = 'p1'
    const wrapper = mount(LandingContentPage)
    await flushPromises()
    expect(wrapper.find('.stub-legacy').exists()).toBe(true)
    expect(wrapper.find('.stub-grapes').exists()).toBe(false)
  })

  it('shows an empty-state hint when there are no pages', async () => {
    const wrapper = mount(LandingContentPage)
    await flushPromises()
    expect(wrapper.text()).toContain('Belum ada landing page')
  })
})
