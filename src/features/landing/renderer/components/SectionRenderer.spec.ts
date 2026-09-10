import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import SectionRenderer from './SectionRenderer.vue'

function mountSection(style: Record<string, unknown>) {
  return mount(SectionRenderer, {
    props: {
      section: {
        id: 's1',
        key: 'el-headline-1',
        type: 'content',
        variant: 'element.headline',
        name: 'Headline',
        sort_order: 10,
        is_enabled: true,
        content: { text: 'Halo' },
        style,
      } as never,
    },
  })
}

describe('SectionRenderer — generic wrapper style', () => {
  it('renders the component without a styled wrapper when no wrapper keys are set', () => {
    const wrapper = mountSection({ variant: 'element.headline' })
    expect(wrapper.find('.element-headline').exists()).toBe(true)
    // the element-block is the root; no extra wrapper carrying inline style
    expect(wrapper.element.classList.contains('element-block')).toBe(true)
  })

  it('applies spacing, background and align to the wrapper', () => {
    const wrapper = mountSection({
      variant: 'element.headline',
      spacing: { top: 24, bottom: 8 },
      background: { color: '#ff0000' },
      align: 'center',
    })
    const style = wrapper.find('div').attributes('style') ?? ''
    expect(style).toContain('padding-top: 24px')
    expect(style).toContain('padding-bottom: 8px')
    expect(style).toContain('text-align: center')
    expect(style).toContain('background-color: rgb(255, 0, 0)')
  })

  it('applies advanced layout (zIndex / position / offset) from style.box to the wrapper', () => {
    const wrapper = mountSection({
      variant: 'element.headline',
      box: { zIndex: 5, offsetY: -40 },
    })
    const style = wrapper.find('div').attributes('style') ?? ''
    expect(style).toContain('z-index: 5')
    expect(style).toContain('position: relative')
    expect(style).toContain('transform: translate(0px, -40px)')
  })
})
