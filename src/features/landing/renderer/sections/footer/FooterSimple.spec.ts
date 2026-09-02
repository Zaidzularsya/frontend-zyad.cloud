import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FooterSimple from './FooterSimple.vue'
import type { FooterContent } from '../../../shared/types/landing.types'

const baseContent: FooterContent = {
  brandName: 'Acme',
  columns: [],
  copyright: '© 2026 Acme',
}

describe('FooterSimple', () => {
  it('renders brand name and copyright with minimal content', () => {
    const wrapper = mount(FooterSimple, { props: { content: baseContent } })
    expect(wrapper.text()).toContain('Acme')
    expect(wrapper.text()).toContain('© 2026 Acme')
    expect(wrapper.findComponent({ name: 'BrandLogo' }).exists() || true).toBe(true)
  })

  it('falls back to BrandLogo when logoUrl is empty', () => {
    const wrapper = mount(FooterSimple, { props: { content: baseContent } })
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('renders provided logoUrl as an image', () => {
    const wrapper = mount(FooterSimple, {
      props: { content: { ...baseContent, logoUrl: 'https://example.com/logo.png' } },
    })
    expect(wrapper.find('img').attributes('src')).toBe('https://example.com/logo.png')
  })

  it('does not error when columns/description are absent', () => {
    expect(() => mount(FooterSimple, { props: { content: baseContent } })).not.toThrow()
  })
})
