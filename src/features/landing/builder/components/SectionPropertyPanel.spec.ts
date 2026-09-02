import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'

vi.mock('@/features/landing/shared/api/landing.api', () => ({ landingApi: {} }))

import { useLandingBuilderStore } from '@/stores/landingBuilder'
import SectionPropertyPanel from './SectionPropertyPanel.vue'

const section = {
  id: 's1',
  key: 'hero-1',
  type: 'hero',
  name: 'Hero',
  sort_order: 10,
  is_enabled: true,
  content: { titleHtml: 'Halo' },
  style: {},
  created_at: '',
  updated_at: '',
}

function mountPanel() {
  return mount(SectionPropertyPanel, {
    props: { section },
    global: {
      stubs: {
        SectionContentForm: {
          template: '<div class="stub-form" />',
          props: ['schema', 'content'],
        },
      },
    },
  })
}

describe('SectionPropertyPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows the schema-driven content form for a hero section', () => {
    const wrapper = mountPanel()
    expect(wrapper.find('.stub-form').exists()).toBe(true)
  })

  it('style tab patches nested style through the store', async () => {
    const store = useLandingBuilderStore()
    store.sections = [structuredClone(section)]
    const patch = vi.spyOn(store, 'patchSection')

    const wrapper = mountPanel()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Gaya')!
      .trigger('click')

    const alignSelect = wrapper.find('select')
    await alignSelect.setValue('center')

    expect(patch).toHaveBeenCalledWith('s1', { style: { align: 'center' } })
  })

  it('advanced tab rejects invalid JSON', async () => {
    const wrapper = mountPanel()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Advanced')!
      .trigger('click')

    const textarea = wrapper.find('textarea')
    await textarea.setValue('{ not json')
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Terapkan content')!
      .trigger('click')

    expect(wrapper.text()).toContain('JSON content tidak valid')
  })
})
