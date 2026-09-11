import { describe, expect, it } from 'vitest'

import {
  DEFAULT_HEADER_PRESENTATION,
  buildHeaderPreview,
  parseHeaderPresentation,
  safeHeaderHref,
} from './grapes.header-component'

describe('parseHeaderPresentation', () => {
  it('returns defaults for empty / invalid input', () => {
    expect(parseHeaderPresentation('')).toEqual(DEFAULT_HEADER_PRESENTATION)
    expect(parseHeaderPresentation('not json')).toEqual(DEFAULT_HEADER_PRESENTATION)
    expect(parseHeaderPresentation(null)).toEqual(DEFAULT_HEADER_PRESENTATION)
  })

  it('parses a JSON string and clamps enums', () => {
    const p = parseHeaderPresentation(
      '{"sticky":false,"variant":"weird","align":"center","showAction":false,"actionLabel":"Go","actionUrl":"/go"}',
    )
    expect(p).toEqual({
      sticky: false,
      variant: 'solid', // "weird" clamped
      align: 'center',
      showAction: false,
      actionLabel: 'Go',
      actionUrl: '/go',
    })
  })

  it('keeps defaults for keys absent from a partial object', () => {
    const p = parseHeaderPresentation({ variant: 'glass' })
    expect(p.variant).toBe('glass')
    expect(p.sticky).toBe(DEFAULT_HEADER_PRESENTATION.sticky)
    expect(p.actionLabel).toBe(DEFAULT_HEADER_PRESENTATION.actionLabel)
  })
})

describe('safeHeaderHref', () => {
  it('allows anchors, roots, http(s), mailto, tel', () => {
    for (const href of ['#faq', '/pricing', 'https://x.test', 'mailto:a@b.c', 'tel:+62']) {
      expect(safeHeaderHref(href)).toBe(href)
    }
  })
  it('rejects everything else', () => {
    for (const href of ['javascript:alert(1)', '//evil.test', 'data:text/html,x', 'ftp://x']) {
      expect(safeHeaderHref(href)).toBe('#')
    }
  })
})

describe('buildHeaderPreview', () => {
  const data = {
    nav: [
      { id: '1', label: 'Harga', href: '/pricing', target: '_self' },
      { id: '2', label: '<x>', href: 'javascript:x', target: '_self' },
    ],
    brandName: 'Acme',
    logoUrl: 'https://cdn.test/l.png',
  }

  it('renders brand, nav and action; escapes labels; neutralises unsafe hrefs', () => {
    const html = buildHeaderPreview(data, DEFAULT_HEADER_PRESENTATION)
    expect(html).toContain('Acme')
    expect(html).toContain('src="https://cdn.test/l.png"')
    expect(html).toContain('href="/pricing"')
    expect(html).toContain('&lt;x&gt;')
    expect(html).not.toContain('javascript:x')
    expect(html).toContain('>Masuk<')
  })

  it('drops the action when showAction is false and shows an empty-nav hint', () => {
    const html = buildHeaderPreview(
      { nav: [], brandName: 'Acme', logoUrl: '' },
      { ...DEFAULT_HEADER_PRESENTATION, showAction: false },
    )
    expect(html).toContain('Belum ada item navigasi')
    expect(html).not.toContain('Masuk')
  })
})
