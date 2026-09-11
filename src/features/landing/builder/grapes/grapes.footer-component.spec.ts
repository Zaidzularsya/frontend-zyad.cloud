import { describe, expect, it } from 'vitest'

import { buildFooterPreview, footerSentinelHTML, safeFooterHref } from './grapes.footer-component'

describe('safeFooterHref', () => {
  it('allows anchors, roots, http(s), mailto, tel', () => {
    for (const href of ['#faq', '/pricing', 'https://x.test', 'mailto:a@b.c', 'tel:+62']) {
      expect(safeFooterHref(href)).toBe(href)
    }
  })
  it('rejects everything else', () => {
    for (const href of ['javascript:alert(1)', '//evil.test', 'data:text/html,x', 'ftp://x']) {
      expect(safeFooterHref(href)).toBe('#')
    }
  })
})

describe('buildFooterPreview', () => {
  it('renders brand and nav links; escapes labels; neutralises unsafe hrefs', () => {
    const html = buildFooterPreview({
      nav: [
        { id: '1', label: 'Privasi', href: '/privacy', target: '_self' },
        { id: '2', label: '<x>', href: 'javascript:x', target: '_self' },
      ],
      brandName: 'Acme',
      logoUrl: 'https://cdn.test/l.png',
    })
    expect(html).toContain('Acme')
    expect(html).toContain('src="https://cdn.test/l.png"')
    expect(html).toContain('href="/privacy"')
    expect(html).toContain('&lt;x&gt;')
    expect(html).not.toContain('javascript:x')
  })

  it('shows an empty-nav hint when there are no items', () => {
    const html = buildFooterPreview({ nav: [], brandName: 'Acme', logoUrl: '' })
    expect(html).toContain('Belum ada item navigasi footer')
  })
})

describe('footerSentinelHTML', () => {
  it('emits the bare sentinel (no per-page presentation)', () => {
    expect(footerSentinelHTML()).toBe('<div data-zyad-slot="tenant-footer"></div>')
  })
})
