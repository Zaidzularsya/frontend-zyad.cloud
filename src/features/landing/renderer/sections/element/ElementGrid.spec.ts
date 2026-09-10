import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ElementGrid from './ElementGrid.vue'

function render(content: Record<string, unknown>) {
  return mount(ElementGrid, { props: { content } })
}

describe('ElementGrid', () => {
  it('exposes column counts as CSS custom properties', () => {
    const style = render({ columns: 4, columnsTablet: 2, columnsMobile: 1, cells: [] })
      .find('.grid-box')
      .attributes('style')!
    expect(style).toContain('--cols: 4')
    expect(style).toContain('--cols-tablet: 2')
    expect(style).toContain('--cols-mobile: 1')
  })

  it('clamps out-of-range / invalid column counts to defaults', () => {
    const style = render({ columns: 99, columnsMobile: 0, cells: [] })
      .find('.grid-box')
      .attributes('style')!
    expect(style).toContain('--cols: 3')
    expect(style).toContain('--cols-mobile: 1')
  })

  it('renders a card per cell with title, body and optional button', () => {
    const wrapper = render({
      cells: [
        { kind: 'card', title: 'A', bodyHtml: 'body A', buttonLabel: 'Go', buttonUrl: '/a' },
        { kind: 'card', title: 'B' },
      ],
    })
    const cards = wrapper.findAll('article.grid-card')
    expect(cards).toHaveLength(2)
    expect(cards[0]!.find('.grid-card__title').text()).toBe('A')
    expect(cards[0]!.find('.grid-card__body').text()).toContain('body A')
    expect(cards[0]!.find('a.grid-card__btn').attributes('href')).toBe('/a')
    expect(cards[1]!.find('a.grid-card__btn').exists()).toBe(false)
  })

  it('supports non-card cells by reusing element components', () => {
    const wrapper = render({
      cells: [
        { kind: 'headline', text: 'H', level: 'h3' },
        { kind: 'image', src: '/x.png' },
      ],
    })
    expect(wrapper.find('.element-headline').text()).toBe('H')
    expect(wrapper.find('img.element-image').attributes('src')).toBe('/x.png')
  })
})
