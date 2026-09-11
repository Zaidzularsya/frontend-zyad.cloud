import { describe, expect, it } from 'vitest'

import { buildPricingPreview, safePricingHref } from './grapes.pricing-component'

describe('safePricingHref', () => {
  it('allows anchors, roots, http(s), mailto, tel', () => {
    for (const href of ['#faq', '/pricing', 'https://x.test', 'mailto:a@b.c', 'tel:+62']) {
      expect(safePricingHref(href)).toBe(href)
    }
  })
  it('rejects everything else', () => {
    for (const href of ['javascript:alert(1)', '//evil.test', 'data:text/html,x', 'ftp://x']) {
      expect(safePricingHref(href)).toBe('#')
    }
  })
})

describe('buildPricingPreview', () => {
  it('renders plan cards; escapes labels; neutralises unsafe hrefs', () => {
    const html = buildPricingPreview({
      plans: [
        {
          id: '1',
          name: 'Starter',
          priceLabel: 'Rp 199.000',
          intervalLabel: '/bulan',
          features: ['5 halaman', '<script>x</script>'],
          ctaLabel: 'Mulai',
          ctaUrl: 'javascript:x',
          isFeatured: false,
        },
        {
          id: '2',
          name: 'Pro',
          priceLabel: 'Rp 499.000',
          features: [],
          ctaLabel: 'Mulai',
          ctaUrl: '/daftar',
          isFeatured: true,
        },
      ],
    })
    expect(html).toContain('Starter')
    expect(html).toContain('Rp 199.000')
    expect(html).toContain('/bulan')
    expect(html).toContain('5 halaman')
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;')
    expect(html).toContain('href="#"') // unsafe CTA url neutralised
    expect(html).toContain('href="/daftar"')
    expect(html).toContain('Populer') // featured badge
  })

  it('shows an empty-state hint when there are no plans', () => {
    const html = buildPricingPreview({ plans: [] })
    expect(html).toContain('Belum ada paket harga')
  })
})
