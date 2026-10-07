import { describe, expect, it } from 'vitest'

import { buildGrapesChrome } from './useGrapesChrome'

describe('buildGrapesChrome', () => {
  it('maps the active header menu into nav links with public hrefs', () => {
    const chrome = buildGrapesChrome(
      {
        Page: { title: 'Home', settings: {} },
        Branding: { company_name: 'Acme', logo_light_url: '/logo.png' },
        Menus: [
          {
            location: 'header',
            is_active: true,
            items: [
              { label: 'Harga', link_type: 'internal_page', destination: 'pricing', sort_order: 2 },
              {
                label: 'Beranda',
                link_type: 'internal_page',
                destination: 'public-marketing',
                sort_order: 1,
              },
              {
                label: 'Docs',
                link_type: 'external_link',
                destination: 'https://docs.test',
                sort_order: 3,
              },
              {
                label: 'Hidden',
                link_type: 'anchor',
                destination: 'x',
                sort_order: 4,
                is_enabled: false,
              },
            ],
          },
        ],
      },
      'Home',
    )

    expect(chrome.nav).toEqual([
      { label: 'Beranda', href: '/', target: 'self' },
      { label: 'Harga', href: '/pricing', target: 'self' },
      { label: 'Docs', href: 'https://docs.test', target: 'self' },
    ])
  })

  it('builds footer chrome from branding + footer menus', () => {
    const chrome = buildGrapesChrome(
      {
        Page: { title: 'Home', settings: { footer_copyright_text: '© 2026 Acme' } },
        Branding: { company_name: 'Acme', logo_light_url: '/logo.png' },
        Menus: [
          {
            name: 'Produk',
            location: 'footer',
            is_active: true,
            items: [
              { label: 'Fitur', link_type: 'internal_page', destination: 'fitur', sort_order: 1 },
            ],
          },
        ],
      },
      'Home',
    )

    expect(chrome.brand).toEqual({ name: 'Acme', logoUrl: '/logo.png' })
    expect(chrome.footer?.brandName).toBe('Acme')
    expect(chrome.footer?.logoUrl).toBe('/logo.png')
    expect(chrome.footer?.copyright).toBe('© 2026 Acme')
    expect(chrome.footer?.columns).toEqual([
      { title: 'Produk', links: [{ label: 'Fitur', href: '/fitur' }] },
    ])
  })

  it('returns empty nav when there is no active header menu', () => {
    const chrome = buildGrapesChrome({ Page: {}, Menus: [] }, 'Home')
    expect(chrome.nav).toEqual([])
  })

  it('reads the organization type', () => {
    expect(buildGrapesChrome({ OrganizationType: 'platform' }, 'x').orgType).toBe('platform')
    expect(buildGrapesChrome({ organization_type: 'customer' }, 'x').orgType).toBe('customer')
    expect(buildGrapesChrome({}, 'x').orgType).toBe('')
  })
})

describe('buildGrapesChrome — forms', () => {
  it('maps PascalCase Forms and sorts fields by SortOrder', () => {
    const chrome = buildGrapesChrome(
      {
        Page: { title: 'Home', settings: {} },
        Forms: [
          {
            ID: 'f1',
            SubmitLabel: 'Kirim',
            SuccessMessage: 'Terima kasih',
            RedirectURL: 'javascript:alert(1)',
            Fields: [
              {
                Key: 'email',
                Type: 'email',
                Label: 'Email',
                Placeholder: 'x',
                Options: [],
                IsRequired: true,
                SortOrder: 2,
              },
              {
                Key: 'name',
                Type: 'text',
                Label: 'Nama',
                Placeholder: '',
                Options: null,
                IsRequired: false,
                SortOrder: 1,
              },
            ],
          },
        ],
      },
      'Home',
    )
    expect(chrome.forms).toHaveLength(1)
    const form = chrome.forms![0]!
    expect(form.id).toBe('f1')
    expect(form.submitLabel).toBe('Kirim')
    expect(form.successMessage).toBe('Terima kasih')
    expect(form.redirectUrl).toBe('')
    expect(form.fields.map((f) => f.key)).toEqual(['name', 'email'])
    expect(form.fields[1]!).toMatchObject({ required: true, type: 'email', placeholder: 'x' })
    expect(form.fields[0]!.options).toEqual([])
  })

  it('keeps a safe redirect and accepts snake_case; missing Forms gives []', () => {
    const chrome = buildGrapesChrome(
      {
        Page: { title: 'Home', settings: {} },
        forms: [{ id: 'f2', submit_label: 'Go', redirect_url: '/terima-kasih', fields: [] }],
      },
      'Home',
    )
    expect(chrome.forms![0]).toMatchObject({
      id: 'f2',
      submitLabel: 'Go',
      redirectUrl: '/terima-kasih',
    })
    expect(buildGrapesChrome({ Page: { title: 'x', settings: {} } }, 'x').forms).toEqual([])
  })
})
