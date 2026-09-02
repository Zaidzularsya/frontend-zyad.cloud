import { describe, expect, it } from 'vitest'
import { useFooterContent } from './useFooterContent'

describe('useFooterContent', () => {
  it('derives brand, columns and copyright from Branding/Menus/Settings', () => {
    const result = useFooterContent(
      {
        Page: { Settings: { footer_copyright_text: '© 2026 Acme' } },
        Branding: { company_name: 'Acme', tagline: 'Build fast', logo_light_url: '/logo.png' },
        Menus: [
          {
            location: 'footer',
            is_active: true,
            name: 'Company',
            items: [
              {
                label: 'About',
                link_type: 'internal_page',
                destination: '/about',
                is_enabled: true,
                sort_order: 0,
              },
            ],
          },
        ],
      },
      'Fallback Title',
    )

    expect(result.brandName).toBe('Acme')
    expect(result.logoUrl).toBe('/logo.png')
    expect(result.description).toBe('Build fast')
    expect(result.copyright).toBe('© 2026 Acme')
    expect(result.columns).toEqual([
      { title: 'Company', links: [{ label: 'About', href: '/about' }] },
    ])
  })

  it('falls back to fallbackTitle and a generated copyright when Branding/Settings are empty', () => {
    const result = useFooterContent({}, 'Fallback Title')
    expect(result.brandName).toBe('Fallback Title')
    expect(result.copyright).toContain(new Date().getFullYear().toString())
    expect(result.columns).toEqual([])
    expect(result.trustBadges).toBeUndefined()
    expect(result.secondaryCta).toBeUndefined()
    expect(result.newsletterFormId).toBeUndefined()
  })

  it('resolves trustBadges directly from Settings', () => {
    const result = useFooterContent(
      {
        Page: {
          Settings: {
            trust_badges: [{ image_url: '/badge.png', label: 'ISO 27001' }],
          },
        },
      },
      'Fallback',
    )
    expect(result.trustBadges).toEqual([{ image_url: '/badge.png', label: 'ISO 27001' }])
  })

  it('resolves secondaryCta by matching secondary_cta_tracking_key against CTAs', () => {
    const result = useFooterContent(
      {
        Page: { Settings: { secondary_cta_tracking_key: 'footer-cta' } },
        CTAs: [
          { tracking_key: 'other-cta', label: 'Other', destination: '/other' },
          { tracking_key: 'footer-cta', label: 'Talk to Sales', destination: '/contact' },
        ],
      },
      'Fallback',
    )
    expect(result.secondaryCta).toEqual({ label: 'Talk to Sales', url: '/contact' })
  })

  it('leaves secondaryCta undefined when tracking key has no matching CTA', () => {
    const result = useFooterContent(
      {
        Page: { Settings: { secondary_cta_tracking_key: 'missing-cta' } },
        CTAs: [{ tracking_key: 'other-cta', label: 'Other', destination: '/other' }],
      },
      'Fallback',
    )
    expect(result.secondaryCta).toBeUndefined()
  })

  it('resolves newsletterFormId straight from Settings', () => {
    const result = useFooterContent(
      { Page: { Settings: { newsletter_form_id: 'form-123' } } },
      'Fallback',
    )
    expect(result.newsletterFormId).toBe('form-123')
  })

  it('accepts PascalCase (Go-style) keys as a fallback', () => {
    const result = useFooterContent(
      {
        Page: { Settings: { SecondaryCTATrackingKey: 'footer-cta', NewsletterFormID: 'form-9' } },
        CTAs: [{ TrackingKey: 'footer-cta', Label: 'Talk to Sales', Destination: '/contact' }],
      },
      'Fallback',
    )
    expect(result.secondaryCta).toEqual({ label: 'Talk to Sales', url: '/contact' })
    expect(result.newsletterFormId).toBe('form-9')
  })
})
