import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ElementSocialButtons from './ElementSocialButtons.vue'

function render(content: Record<string, unknown>, style?: Record<string, unknown>) {
  return mount(ElementSocialButtons, { props: { content, styleConfig: style } })
}

describe('ElementSocialButtons', () => {
  it('renders one <a> with an inline <svg> per known platform', () => {
    const wrapper = render({
      items: [
        { platform: 'instagram', url: 'https://instagram.com/x' },
        { platform: 'linkedin', url: 'https://linkedin.com/x' },
      ],
    })
    const links = wrapper.findAll('a.social-row__btn')
    expect(links).toHaveLength(2)
    expect(wrapper.findAll('svg.social-row__icon')).toHaveLength(2)
    expect(wrapper.find('svg path').attributes('d')?.length).toBeGreaterThan(20)
  })

  it('drops items whose platform has no icon', () => {
    const wrapper = render({
      items: [
        { platform: 'instagram', url: 'https://instagram.com/x' },
        { platform: 'myspace', url: 'https://myspace.com/x' },
      ],
    })
    expect(wrapper.findAll('a.social-row__btn')).toHaveLength(1)
  })

  it('sets an accessible label, opens in a new tab and rejects unsafe hrefs', () => {
    const wrapper = render({
      items: [
        { platform: 'x', url: 'javascript:alert(1)', label: 'Ikuti kami di X' },
        { platform: 'email', url: 'mailto:hi@zyad.test' },
      ],
    })
    const [x, email] = wrapper.findAll('a.social-row__btn')
    expect(x!.attributes('aria-label')).toBe('Ikuti kami di X')
    expect(x!.attributes('target')).toBe('_blank')
    expect(x!.attributes('rel')).toContain('noopener')
    expect(x!.attributes('href')).toBe('#')
    expect(email!.attributes('aria-label')).toBe('Email')
    expect(email!.attributes('href')).toBe('mailto:hi@zyad.test')
  })

  it('solid style fills the brand colour; a colours.primary override wins', () => {
    const plain = render({ items: [{ platform: 'youtube', url: 'https://y.test' }] })
    expect(plain.find('a.social-row__btn').attributes('style')).toContain(
      'background: rgb(255, 0, 0)',
    )

    const overridden = render(
      { style: 'solid', items: [{ platform: 'youtube', url: 'https://y.test' }] },
      { colors: { primary: '#123456' } },
    )
    expect(overridden.find('a.social-row__btn').attributes('style')).toContain(
      'background: rgb(18, 52, 86)',
    )
  })
})
