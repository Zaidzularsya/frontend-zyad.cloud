import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import FooterSlot from './FooterSlot.vue'
import HeaderSlot from './HeaderSlot.vue'
import TenantPricingSlot from './TenantPricingSlot.vue'
import { SLOT_REGISTRY, slotStyles } from '../slot-registry'

function mountHeader(zyadHeader: string, chrome = {}) {
  const host = document.createElement('div')
  const w = mount(HeaderSlot, { props: { host, dataset: { zyadHeader }, chrome } })
  return { host, w }
}

function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
  window.dispatchEvent(new Event('scroll'))
}

describe('HeaderSlot', () => {
  it('renders brand, nav, action and applies sticky class to host', () => {
    const host = document.createElement('div')
    const w = mount(HeaderSlot, {
      props: {
        host,
        dataset: {
          zyadHeader: '{"position":"sticky","actionLabel":"Mulai","actionUrl":"/auth/register"}',
        },
        chrome: { brand: { name: 'Zyad' }, nav: [{ label: 'Harga', href: '#harga' }] },
      },
    })
    expect(w.find('.zyad-tenant-header__brand').text()).toBe('Zyad')
    expect(w.find('.zyad-tenant-header__nav a').attributes('href')).toBe('#harga')
    expect(w.find('.zyad-tenant-header__action').attributes('href')).toBe('/auth/register')
    expect(host.classList.contains('zyad-tenant-header-host--sticky')).toBe(true)
    w.unmount()
    expect(host.className).toBe('')
  })

  it('uses fixed class for position fixed', () => {
    const { host, w } = mountHeader('{"position":"fixed"}')
    expect(host.classList.contains('zyad-tenant-header-host--fixed')).toBe(true)
    expect(host.classList.contains('zyad-tenant-header-host--sticky')).toBe(false)
    w.unmount()
  })

  it('hides on scroll down past 80px when hideOnScroll', () => {
    scrollTo(0)
    const { host, w } = mountHeader('{"hideOnScroll":true}')
    scrollTo(200)
    expect(host.classList.contains('zyad-tenant-header-host--hidden')).toBe(true)
    scrollTo(100)
    expect(host.classList.contains('zyad-tenant-header-host--hidden')).toBe(false)
    w.unmount()
    scrollTo(0)
  })

  it('does not hide on scroll without hideOnScroll and detaches listener on unmount', () => {
    scrollTo(0)
    const { host, w } = mountHeader('{"hideOnScroll":true}')
    w.unmount()
    scrollTo(300)
    expect(host.className).toBe('')
    const second = mountHeader('{}')
    scrollTo(500)
    expect(second.host.classList.contains('zyad-tenant-header-host--hidden')).toBe(false)
    second.w.unmount()
    scrollTo(0)
  })

  it('neutralises javascript: hrefs', () => {
    const { w } = mountHeader('{"actionUrl":"javascript:alert(1)"}', {
      nav: [{ label: 'X', href: 'javascript:x' }],
    })
    expect(w.find('.zyad-tenant-header__nav a').attributes('href')).toBe('#')
    expect(w.find('.zyad-tenant-header__action').attributes('href')).toBe('#')
    w.unmount()
  })

  it('opens new_tab links with rel noopener', () => {
    const { w } = mountHeader('{}', {
      nav: [{ label: 'A', href: 'https://a.test', target: 'new_tab' }],
    })
    const a = w.find('.zyad-tenant-header__nav a')
    expect(a.attributes('target')).toBe('_blank')
    expect(a.attributes('rel')).toBe('noopener noreferrer')
    w.unmount()
  })
})

describe('FooterSlot', () => {
  const host = document.createElement('div')
  it('renders columns + copyright', () => {
    const w = mount(FooterSlot, {
      props: {
        host,
        dataset: {},
        chrome: {
          footer: {
            brandName: 'Zyad',
            logoUrl: '/logo.png',
            copyright: '(c) 2026',
            columns: [{ title: 'Produk', links: [{ label: 'Harga', href: '/harga' }] }],
          },
        },
      },
    })
    expect(w.find('.zyad-tenant-footer__brand img').attributes('src')).toBe('/logo.png')
    expect(w.find('.zyad-tenant-footer__brand span').text()).toBe('Zyad')
    expect(w.find('.zyad-tenant-footer__title').text()).toBe('Produk')
    expect(w.find('.zyad-tenant-footer__col nav a').attributes('href')).toBe('/harga')
    expect(w.find('.zyad-tenant-footer__copyright').text()).toBe('(c) 2026')
  })
  it('renders nothing without chrome.footer', () => {
    const w = mount(FooterSlot, { props: { host, dataset: {}, chrome: {} } })
    expect(w.find('.zyad-tenant-footer').exists()).toBe(false)
    expect(w.html()).toBe('<!--v-if-->')
  })
})

describe('TenantPricingSlot', () => {
  const host = document.createElement('div')
  const plan = {
    id: '1',
    name: 'Pro',
    priceLabel: 'Rp 99.000',
    intervalLabel: '/bulan',
    description: 'Untuk tim',
    features: ['A', '', 'B'],
    ctaLabel: 'Pilih',
    ctaUrl: '/checkout',
    isFeatured: true,
  }
  it('renders featured badge "Populer" and CTA', () => {
    const w = mount(TenantPricingSlot, {
      props: {
        host,
        dataset: {},
        chrome: { pricingPlans: [plan, { ...plan, id: '2', isFeatured: false }] },
      },
    })
    const cards = w.findAll('.zyad-pricing-plans__card')
    expect(cards).toHaveLength(2)
    expect(cards[0]!.classes()).toContain('zyad-pricing-plans__card--featured')
    expect(cards[0]!.find('.zyad-pricing-plans__badge').text()).toBe('Populer')
    expect(cards[1]!.find('.zyad-pricing-plans__badge').exists()).toBe(false)
    expect(cards[0]!.find('.zyad-pricing-plans__price').text()).toContain('Rp 99.000')
    expect(cards[0]!.find('.zyad-pricing-plans__interval').text()).toBe('/bulan')
    expect(cards[0]!.findAll('.zyad-pricing-plans__features li')).toHaveLength(2)
    expect(cards[0]!.find('.zyad-pricing-plans__cta').attributes('href')).toBe('/checkout')
  })
  it('renders nothing when plans empty', () => {
    const w = mount(TenantPricingSlot, {
      props: { host, dataset: {}, chrome: { pricingPlans: [] } },
    })
    expect(w.find('.zyad-pricing-plans').exists()).toBe(false)
  })
})

describe('slot registry', () => {
  it('registers the four slots', () => {
    expect(Object.keys(SLOT_REGISTRY).sort()).toEqual([
      'catalog-pricing',
      'pricing-plans',
      'tenant-footer',
      'tenant-nav',
    ])
  })
  it('slotStyles includes each slot css', () => {
    const css = slotStyles()
    expect(css).toMatch(/\.zyad-tenant-footer\s*\{/)
    expect(css).toMatch(/\.zyad-pricing-plans\s*\{/)
    expect(css).toContain('.zyad-tenant-header-host--sticky')
    expect(css).toContain('.zy-slot-catalog-pricing__card')
  })
})
