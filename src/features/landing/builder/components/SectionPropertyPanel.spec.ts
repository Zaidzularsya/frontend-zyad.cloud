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

const elementSection = {
  id: 'e1',
  key: 'el-headline-1',
  type: 'content',
  variant: 'element.headline',
  name: 'Headline',
  sort_order: 10,
  is_enabled: true,
  content: { text: 'Judul', level: 'h2' },
  style: { variant: 'element.headline' },
  created_at: '',
  updated_at: '',
}

function mountPanel(sectionProp: Record<string, unknown> = section) {
  return mount(SectionPropertyPanel, {
    props: { section: sectionProp as never },
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

  it('renders the CONTENT / APPEARANCE / SPACING / ADVANCED accordions', () => {
    const wrapper = mountPanel()
    const headings = wrapper.findAll('summary').map((s) => s.text())
    expect(headings.some((t) => t.includes('Content'))).toBe(true)
    expect(headings.some((t) => t.includes('Appearance'))).toBe(true)
    expect(headings.some((t) => t.includes('Spacing'))).toBe(true)
    expect(headings.some((t) => t.includes('Advanced'))).toBe(true)
  })

  it('appearance form patches style.align through the store', async () => {
    const store = useLandingBuilderStore()
    store.sections = [structuredClone(section)]
    const patch = vi.spyOn(store, 'patchSection')

    const wrapper = mountPanel()
    const alignSelect = wrapper.find('select')
    await alignSelect.setValue('center')

    expect(patch).toHaveBeenCalledWith('s1', { style: { align: 'center' } })
  })

  it('appearance form patches style.typography for an element block', async () => {
    const store = useLandingBuilderStore()
    store.sections = [structuredClone(elementSection)]
    const patch = vi.spyOn(store, 'patchSection')

    const wrapper = mountPanel(elementSection)
    const fontSizeInput = wrapper.find('input[type="number"]')
    await fontSizeInput.setValue('40')

    expect(patch).toHaveBeenCalledWith('e1', {
      style: { variant: 'element.headline', typography: { size: 40 } },
    })
  })

  it('advanced accordion rejects invalid JSON', async () => {
    const wrapper = mountPanel()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('{ not json')
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Terapkan content')!
      .trigger('click')

    expect(wrapper.text()).toContain('JSON content tidak valid')
  })
})
