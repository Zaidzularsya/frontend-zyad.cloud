import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import GrapesPageFrame from './GrapesPageFrame.vue'

function srcdocOf(wrapper: ReturnType<typeof mount>) {
  return wrapper.get('iframe').attributes('srcdoc') ?? ''
}

describe('GrapesPageFrame', () => {
  it('renders the markup inside a script-less sandboxed iframe', () => {
    const wrapper = mount(GrapesPageFrame, {
      props: { html: '<section><h1>Hai</h1></section>', css: 'h1{color:#333}' },
    })

    const iframe = wrapper.get('iframe')
    const sandbox = iframe.attributes('sandbox') ?? ''
    expect(sandbox).toContain('allow-forms')
    // Needed so contentDocument/scrollHeight is readable for auto-height; safe
    // only because allow-scripts is absent (see file doc-comment).
    expect(sandbox).toContain('allow-same-origin')
    expect(sandbox).not.toContain('allow-scripts')

    const doc = srcdocOf(wrapper)
    expect(doc).toContain('<h1>Hai</h1>')
    expect(doc).toContain('h1{color:#333}')
  })

  it('strips <script> and event handlers from the HTML', () => {
    const wrapper = mount(GrapesPageFrame, {
      props: {
        html: '<div onclick="alert(1)">x</div><script>alert(2)</script><img src=x onerror="alert(3)">',
        css: '',
      },
    })

    const doc = srcdocOf(wrapper)
    expect(doc).not.toContain('<script>')
    expect(doc).not.toContain('onclick')
    expect(doc).not.toContain('onerror')
    expect(doc).toContain('<div>x</div>')
  })

  it('scrubs @import and style-tag breakouts from the CSS', () => {
    const wrapper = mount(GrapesPageFrame, {
      props: {
        html: '<p>a</p>',
        css: "@import url('https://evil.test/x.css'); body{color:red} </style><script>alert(1)</script>",
      },
    })

    const doc = srcdocOf(wrapper)
    expect(doc).not.toContain('@import')
    expect(doc).not.toContain('</style><script>')
    expect(doc).toContain('body{color:red}')
  })

  it('has no default border and full width', () => {
    const wrapper = mount(GrapesPageFrame, { props: { html: '<p>a</p>', css: '' } })
    expect(wrapper.get('iframe').classes()).toContain('grapes-page-frame')
  })

  it('fills the tenant-nav sentinel with the live header (brand + nav + action)', () => {
    const wrapper = mount(GrapesPageFrame, {
      props: {
        html: `<div data-zyad-slot="tenant-nav" data-zyad-header='{"sticky":true,"variant":"glass","align":"center","showAction":true,"actionLabel":"Masuk","actionUrl":"/login"}' class="hdr-x" style="opacity:.9"><span>placeholder</span></div><p>body</p>`,
        css: '',
        chrome: {
          brand: { name: 'Acme', logoUrl: 'https://cdn.test/logo.png' },
          nav: [
            { label: 'Harga', href: '/pricing' },
            { label: 'Blog', href: 'https://blog.test', target: 'new_tab' },
          ],
        },
      },
    })

    const doc = srcdocOf(wrapper)
    expect(doc).toContain('zyad-tenant-header--glass')
    expect(doc).toContain('zyad-tenant-header--center')
    expect(doc).toContain('zyad-tenant-header--sticky')
    expect(doc).toContain('class="zyad-tenant-header__brand"')
    expect(doc).toContain('src="https://cdn.test/logo.png"')
    expect(doc).toContain('>Acme<')
    expect(doc).toContain('href="/pricing"')
    expect(doc).toContain('>Harga<')
    expect(doc).toContain('href="https://blog.test"')
    expect(doc).toContain('target="_blank"')
    expect(doc).toContain('class="zyad-tenant-header__action"')
    expect(doc).toContain('>Masuk<')
    // Inner content (old placeholder markup) is replaced with the live header...
    expect(doc).not.toContain('placeholder')
    // ...but a custom class/style the author set via the Style Manager on the
    // sentinel div itself (e.g. for a transparent header overlapping a hero)
    // survives the fill, only the consumed data-zyad-header attribute is gone.
    expect(doc).toContain('class="hdr-x"')
    expect(doc).toContain('style="opacity:.9"')
    expect(doc).not.toContain('data-zyad-header')
    expect(doc).toContain('<p>body</p>')
  })

  it('honours header presentation (no sticky / no action)', () => {
    const wrapper = mount(GrapesPageFrame, {
      props: {
        html: `<div data-zyad-slot="tenant-nav" data-zyad-header='{"sticky":false,"variant":"transparent","align":"left","showAction":false,"actionLabel":"x","actionUrl":"/x"}'></div>`,
        css: '',
        chrome: { brand: { name: 'Acme' }, nav: [] },
      },
    })
    const doc = srcdocOf(wrapper)
    expect(doc).toContain(
      'class="zyad-tenant-header zyad-tenant-header--transparent zyad-tenant-header--left"',
    )
    expect(doc).not.toContain('class="zyad-tenant-header__action"')
  })

  it('drops unsafe hrefs in chrome links', () => {
    const wrapper = mount(GrapesPageFrame, {
      props: {
        html: '<div data-zyad-slot="tenant-nav"></div>',
        css: '',
        chrome: { nav: [{ label: 'Evil', href: ['java', 'script:alert(1)'].join('') }] },
      },
    })
    const doc = srcdocOf(wrapper)
    expect(doc).not.toContain('javascript:')
    expect(doc).toContain('href="#"')
  })

  it('fills the tenant-footer sentinel with brand + columns', () => {
    const wrapper = mount(GrapesPageFrame, {
      props: {
        html: '<main>x</main><div data-zyad-slot="tenant-footer"></div>',
        css: '',
        chrome: {
          footer: {
            brandName: 'Acme',
            copyright: '© 2026 Acme',
            columns: [{ title: 'Produk', links: [{ label: 'Fitur', href: '/fitur' }] }],
          },
        },
      },
    })
    const doc = srcdocOf(wrapper)
    expect(doc).toContain('zyad-tenant-footer')
    expect(doc).toContain('>Acme<')
    expect(doc).toContain('>Produk<')
    expect(doc).toContain('href="/fitur"')
    expect(doc).toContain('© 2026 Acme')
  })

  it('preserves a custom class/style on the tenant-footer sentinel', () => {
    const wrapper = mount(GrapesPageFrame, {
      props: {
        html: '<div data-zyad-slot="tenant-footer" class="ftr-x" style="background:#111"></div>',
        css: '',
        chrome: { footer: { brandName: 'Acme' } },
      },
    })
    const doc = srcdocOf(wrapper)
    expect(doc).toContain('class="ftr-x"')
    expect(doc).toContain('style="background:#111"')
  })

  it('fills only the first tenant-nav sentinel and drops any extra duplicate', () => {
    const wrapper = mount(GrapesPageFrame, {
      props: {
        html:
          '<div data-zyad-slot="tenant-nav"></div><main>x</main>' +
          '<div data-zyad-slot="tenant-nav"></div>',
        css: '',
        chrome: { brand: { name: 'Acme' }, nav: [{ label: 'Harga', href: '/pricing' }] },
      },
    })
    const doc = srcdocOf(wrapper)
    expect(doc.match(/zyad-tenant-header /g)?.length).toBe(1)
    expect(doc.match(/data-zyad-slot="tenant-nav"/g)?.length).toBe(1)
  })

  it('fills only the first tenant-footer sentinel and drops any extra duplicate', () => {
    const wrapper = mount(GrapesPageFrame, {
      props: {
        html:
          '<div data-zyad-slot="tenant-footer"></div><main>x</main>' +
          '<div data-zyad-slot="tenant-footer"></div>',
        css: '',
        chrome: { footer: { brandName: 'Acme' } },
      },
    })
    const doc = srcdocOf(wrapper)
    expect(doc.match(/class="zyad-tenant-footer"/g)?.length).toBe(1)
    expect(doc.match(/data-zyad-slot="tenant-footer"/g)?.length).toBe(1)
  })

  it('fills the pricing-plans sentinel with plan cards', () => {
    const wrapper = mount(GrapesPageFrame, {
      props: {
        html: '<div data-zyad-slot="pricing-plans"></div><main>x</main>',
        css: '',
        chrome: {
          pricingPlans: [
            {
              id: 'p1',
              name: 'Starter',
              priceLabel: 'Rp 199.000',
              intervalLabel: '/bulan',
              features: ['5 halaman'],
              ctaLabel: 'Mulai',
              ctaUrl: '/daftar',
              isFeatured: true,
            },
          ],
        },
      },
    })
    const doc = srcdocOf(wrapper)
    expect(doc).toContain('zyad-pricing-plans')
    expect(doc).toContain('Starter')
    expect(doc).toContain('Rp 199.000')
    expect(doc).toContain('<li>5 halaman</li>')
    expect(doc).toContain('href="/daftar"')
    expect(doc).toContain('zyad-pricing-plans__card--featured')
  })

  it('fills only the first pricing-plans sentinel and drops any extra duplicate', () => {
    const wrapper = mount(GrapesPageFrame, {
      props: {
        html:
          '<div data-zyad-slot="pricing-plans"></div><main>x</main>' +
          '<div data-zyad-slot="pricing-plans"></div>',
        css: '',
        chrome: {
          pricingPlans: [
            {
              id: 'p1',
              name: 'Starter',
              priceLabel: 'Rp 199.000',
              features: [],
              ctaLabel: 'Mulai',
              isFeatured: false,
            },
          ],
        },
      },
    })
    const doc = srcdocOf(wrapper)
    expect(doc.match(/class="zyad-pricing-plans"/g)?.length).toBe(1)
    expect(doc.match(/data-zyad-slot="pricing-plans"/g)?.length).toBe(1)
  })

  it('leaves the HTML untouched when there is no sentinel', () => {
    const wrapper = mount(GrapesPageFrame, {
      props: {
        html: '<section><h1>Judul</h1></section>',
        css: '',
        chrome: { nav: [{ label: 'Harga', href: '/pricing' }] },
      },
    })
    const doc = srcdocOf(wrapper)
    expect(doc).toContain('<h1>Judul</h1>')
    expect(doc).not.toContain('class="zyad-tenant-nav"')
    expect(doc).not.toContain('<nav')
  })
})
