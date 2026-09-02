import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FooterMega from './FooterMega.vue'
import type { FooterContent } from '../../../shared/types/landing.types'

const baseContent: FooterContent = {
  brandName: 'Acme',
  description: 'Acme description',
  columns: [{ title: 'Company', links: [{ label: 'About', href: '/about' }] }],
  copyright: '© 2026 Acme',
}

describe('FooterMega', () => {
  it('renders columns and copyright', () => {
    const wrapper = mount(FooterMega, { props: { content: baseContent } })
    expect(wrapper.text()).toContain('Company')
    expect(wrapper.text()).toContain('About')
    expect(wrapper.text()).toContain('© 2026 Acme')
  })

  it('hides trust badges block when trustBadges is empty/undefined', () => {
    const wrapper = mount(FooterMega, { props: { content: baseContent } })
    expect(wrapper.findAll('img').length).toBe(0)
  })

  it('renders trust badges when provided', () => {
    const wrapper = mount(FooterMega, {
      props: {
        content: {
          ...baseContent,
          trustBadges: [{ image_url: 'https://example.com/badge.png', label: 'ISO 27001' }],
        },
      },
    })
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('alt')).toBe('ISO 27001')
  })

  it('hides secondary CTA when not provided', () => {
    const wrapper = mount(FooterMega, { props: { content: baseContent } })
    expect(wrapper.find('a.bg-secondary').exists()).toBe(false)
  })

  it('renders secondary CTA when provided', () => {
    const wrapper = mount(FooterMega, {
      props: {
        content: { ...baseContent, secondaryCta: { label: 'Talk to Sales', url: '/contact' } },
      },
    })
    const cta = wrapper.find('a.bg-secondary')
    expect(cta.exists()).toBe(true)
    expect(cta.text()).toBe('Talk to Sales')
  })

  it('does not error with empty columns', () => {
    expect(() =>
      mount(FooterMega, { props: { content: { ...baseContent, columns: [] } } }),
    ).not.toThrow()
  })
})
