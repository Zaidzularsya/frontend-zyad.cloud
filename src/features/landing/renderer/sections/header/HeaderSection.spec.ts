import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import HeaderSection from './HeaderSection.vue'

function render(content: Record<string, unknown>) {
  return mount(HeaderSection, { props: { content } })
}

describe('HeaderSection', () => {
  it('renders synthesized menu items with the right target', () => {
    const wrapper = render({
      brandName: 'Acme',
      items: [
        { id: '1', label: 'Pricing', href: '/pricing', target: 'self' },
        { id: '2', label: 'Docs', href: 'https://docs.test', target: 'new_tab' },
      ],
    })
    const links = wrapper.findAll('.header-link')
    expect(links).toHaveLength(2)
    expect(links[0]!.text()).toBe('Pricing')
    expect(links[0]!.attributes('target')).toBeUndefined()
    expect(links[1]!.attributes('target')).toBe('_blank')
    expect(links[1]!.attributes('rel')).toContain('noopener')
    expect(wrapper.text()).toContain('Acme')
  })

  it('is sticky by default and drops sticky when disabled', () => {
    expect(render({}).find('.header-section').classes()).toContain('is-sticky')
    expect(render({ sticky: false }).find('.header-section').classes()).not.toContain('is-sticky')
  })

  it('hides the CTA when showLoginCta is false', () => {
    expect(render({ showLoginCta: true, ctaLabel: 'Masuk' }).find('.header-cta').exists()).toBe(
      true,
    )
    expect(render({ showLoginCta: false }).find('.header-cta').exists()).toBe(false)
  })

  it('applies a custom CTA colour', () => {
    const wrapper = render({ ctaColor: '#ff0000', ctaLabel: 'Go' })
    expect(wrapper.find('.header-cta').attributes('style')).toContain('rgb(255, 0, 0)')
  })

  it('defaults to a solid, centered bar with no shadow', () => {
    const classes = render({}).find('.header-section').classes()
    expect(classes).toContain('is-solid')
    expect(classes).toContain('align-center')
    expect(classes.some((c) => c.startsWith('has-shadow'))).toBe(false)
  })

  it('reflects alignment, variant, shadow and width from content', () => {
    const classes = render({
      alignment: 'left',
      variant: 'glass',
      shadow: 'md',
      width: 'full',
    })
      .find('.header-section')
      .classes()
    expect(classes).toEqual(
      expect.arrayContaining(['align-left', 'is-glass', 'has-shadow-md', 'is-full']),
    )
  })

  it('maps the legacy transparentOnTop flag to the transparent variant', () => {
    expect(render({ transparentOnTop: true }).find('.header-section').classes()).toContain(
      'is-transparent',
    )
  })

  describe('logo resolution', () => {
    it('prefers the per-page override over the tenant logo', () => {
      const wrapper = render({
        logoUrl: '/page-logo.png',
        brandLogoLight: '/brand-light.png',
        brandLogoDark: '/brand-dark.png',
      })
      expect(wrapper.find('.header-logo').attributes('src')).toBe('/page-logo.png')
    })

    it('uses the tenant light logo on a solid bar', () => {
      const wrapper = render({
        brandLogoLight: '/brand-light.png',
        brandLogoDark: '/brand-dark.png',
      })
      expect(wrapper.find('.header-logo').attributes('src')).toBe('/brand-light.png')
    })

    it('switches to the dark logo on a see-through bar', () => {
      const wrapper = render({
        variant: 'glass',
        brandLogoLight: '/brand-light.png',
        brandLogoDark: '/brand-dark.png',
      })
      expect(wrapper.find('.header-logo').attributes('src')).toBe('/brand-dark.png')
    })

    it('falls back to the light logo when no dark asset exists', () => {
      const wrapper = render({ variant: 'transparent', brandLogoLight: '/brand-light.png' })
      expect(wrapper.find('.header-logo').attributes('src')).toBe('/brand-light.png')
    })
  })
})
