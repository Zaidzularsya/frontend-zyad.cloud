import { beforeAll, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import HeroSection from './HeroSection.vue'

beforeAll(() => {
  // HeroSection queries prefers-reduced-motion on mount; jsdom does not implement matchMedia.
  window.matchMedia =
    window.matchMedia ||
    ((query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList)
})

// BrandLogoAnimated renders decorative canvas/particle effects unrelated to the
// sanitization behavior under test, and relies on browser APIs jsdom doesn't implement.
const mountOptions = {
  global: { stubs: { BrandLogoAnimated: true } },
}

describe('HeroSection', () => {
  it('strips script tags from titleHtml', () => {
    const wrapper = mount(HeroSection, {
      ...mountOptions,
      props: { content: { titleHtml: 'Welcome <script>alert(1)</script>' } },
    })
    expect(wrapper.html()).not.toContain('<script>')
    expect(wrapper.text()).toContain('Welcome')
  })

  it('strips event handler attributes from titleHtml', () => {
    const wrapper = mount(HeroSection, {
      ...mountOptions,
      props: { content: { titleHtml: '<img src=x onerror=alert(1)>Welcome' } },
    })
    expect(wrapper.html()).not.toContain('onerror')
  })

  it('strips javascript: hrefs from titleHtml', () => {
    const wrapper = mount(HeroSection, {
      ...mountOptions,
      props: { content: { titleHtml: "Click <a href='javascript:alert(1)'>here</a>" } },
    })
    expect(wrapper.html()).not.toContain('javascript:')
  })

  it('preserves allowed inline formatting tags', () => {
    const wrapper = mount(HeroSection, {
      ...mountOptions,
      props: { content: { titleHtml: 'Welcome <strong>friend</strong>' } },
    })
    expect(wrapper.html()).toContain('<strong>friend</strong>')
  })

  it('falls back to plain title when titleHtml is absent', () => {
    const wrapper = mount(HeroSection, {
      ...mountOptions,
      props: { content: { title: 'Plain title' } },
    })
    expect(wrapper.text()).toContain('Plain title')
  })
})
