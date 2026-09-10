import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ElementButtonGroup from './ElementButtonGroup.vue'

function render(content: Record<string, unknown>, style?: Record<string, unknown>) {
  return mount(ElementButtonGroup, { props: { content, styleConfig: style } })
}

describe('ElementButtonGroup', () => {
  it('renders one <a> per item with its label', () => {
    const wrapper = render({
      items: [
        { label: 'One', url: '/one' },
        { label: 'Two', url: '/two' },
        { label: 'Three', url: '/three' },
      ],
    })
    const links = wrapper.findAll('a.button-group__btn')
    expect(links).toHaveLength(3)
    expect(links.map((l) => l.text())).toEqual(['One', 'Two', 'Three'])
    expect(links[1]!.attributes('href')).toBe('/two')
  })

  it('follows content.direction on the flex row', () => {
    expect(
      render({ direction: 'column', items: [] }).find('.button-group').attributes('style'),
    ).toContain('flex-direction: column')
    expect(
      render({ direction: 'row', items: [] }).find('.button-group').attributes('style'),
    ).toContain('flex-direction: row')
  })

  it('maps per-item variant to distinct styling', () => {
    const wrapper = render(
      {
        items: [
          { label: 'P', variant: 'primary' },
          { label: 'S', variant: 'secondary' },
          { label: 'G', variant: 'ghost' },
        ],
      },
      { colors: { primary: '#111111', text: '#ffffff' } },
    )
    const [p, s, g] = wrapper.findAll('a.button-group__btn').map((l) => l.attributes('style') ?? '')
    expect(p).toContain('background: rgb(17, 17, 17)')
    expect(s).toContain('border: 1px solid rgb(17, 17, 17)')
    expect(s).toContain('background: transparent')
    expect(g).toContain('background: transparent')
    expect(g).not.toContain('border:')
  })

  it('opens external links safely', () => {
    const link = render({ items: [{ label: 'X', url: 'https://x.test', target: '_blank' }] }).find(
      'a.button-group__btn',
    )
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toContain('noopener')
  })
})
