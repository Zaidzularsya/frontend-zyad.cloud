import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ElementContainer from './ElementContainer.vue'

function render(content: Record<string, unknown>, style?: Record<string, unknown>) {
  return mount(ElementContainer, { props: { content, styleConfig: style } })
}

describe('ElementContainer', () => {
  it('renders one child per item, resolved by kind', () => {
    const wrapper = render({
      items: [
        { kind: 'headline', text: 'Judul', level: 'h3' },
        { kind: 'paragraph', bodyHtml: 'Isi' },
        { kind: 'button', label: 'Klik', url: '/x' },
        { kind: 'image', src: '/a.png', alt: 'A' },
      ],
    })
    expect(wrapper.find('.element-headline').text()).toBe('Judul')
    expect(wrapper.find('.element-paragraph').text()).toContain('Isi')
    expect(wrapper.find('a.element-button').attributes('href')).toBe('/x')
    expect(wrapper.find('img.element-image').attributes('src')).toBe('/a.png')
  })

  it('applies maxWidth / padding / gap to the box', () => {
    const style = render({ maxWidth: 640, padding: 32, gap: 12, items: [] })
      .find('.container-box')
      .attributes('style')!
    expect(style).toContain('max-width: 640px')
    expect(style).toContain('padding: 32px')
    expect(style).toContain('gap: 12px')
  })

  it('skips an unknown kind', () => {
    const wrapper = render({ items: [{ kind: 'video' as never }, { kind: 'headline', text: 'H' }] })
    expect(wrapper.findAll('.container-box > *')).toHaveLength(1)
  })
})
