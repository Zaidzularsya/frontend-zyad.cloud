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
      '{"position":"fixed","variant":"weird","layout":"spread","groupAlign":"center","container":false,"showAction":false,"actionLabel":"Go","actionUrl":"/go"}',
    )
    expect(p).toEqual({
      position: 'fixed',
      variant: 'solid', // "weird" clamped
      layout: 'spread',
      groupAlign: 'center',
      container: false,
      showAction: false,
      actionLabel: 'Go',
      actionUrl: '/go',
      hideOnScroll: false,
    })
  })

  it('keeps defaults for keys absent from a partial object', () => {
    const p = parseHeaderPresentation({ variant: 'glass' })
    expect(p.variant).toBe('glass')
    expect(p.position).toBe(DEFAULT_HEADER_PRESENTATION.position)
    expect(p.layout).toBe(DEFAULT_HEADER_PRESENTATION.layout)
    expect(p.container).toBe(DEFAULT_HEADER_PRESENTATION.container)
    expect(p.actionLabel).toBe(DEFAULT_HEADER_PRESENTATION.actionLabel)
  })

  it('migrates legacy sticky/align presentations into position/layout/groupAlign, defaulting container to true', () => {
    const p = parseHeaderPresentation(
      '{"sticky":false,"variant":"glass","align":"center","showAction":true,"actionLabel":"Masuk","actionUrl":"/login"}',
    )
    expect(p.position).toBe('static')
    expect(p.layout).toBe('grouped')
    expect(p.groupAlign).toBe('center')
    expect(p.container).toBe(true)
  })

  it('migrates legacy sticky:true to position:sticky', () => {
    const p = parseHeaderPresentation('{"sticky":true,"align":"right"}')
    expect(p.position).toBe('sticky')
    expect(p.groupAlign).toBe('right')
  })

  it('parses hideOnScroll, defaulting to false', () => {
    expect(parseHeaderPresentation('{"hideOnScroll":true}').hideOnScroll).toBe(true)
    expect(parseHeaderPresentation('{}').hideOnScroll).toBe(false)
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

  it('applies fixed position styling', () => {
    const html = buildHeaderPreview(data, { ...DEFAULT_HEADER_PRESENTATION, position: 'fixed' })
    expect(html).toContain('position:fixed')
  })

  it('groups nav+action to the right for layout:split', () => {
    const html = buildHeaderPreview(data, { ...DEFAULT_HEADER_PRESENTATION, layout: 'split' })
    expect(html).toContain('margin-left:auto')
  })

  it('centers nav and lets it grow for layout:spread, still respecting container', () => {
    const html = buildHeaderPreview(data, {
      ...DEFAULT_HEADER_PRESENTATION,
      layout: 'spread',
      container: true,
    })
    expect(html).toContain('flex:1;justify-content:center')
    expect(html).toContain('max-width:1120px')
  })

  it('applies max-width when container is active for a non-spread layout', () => {
    const html = buildHeaderPreview(data, {
      ...DEFAULT_HEADER_PRESENTATION,
      layout: 'grouped',
      container: true,
    })
    expect(html).toContain('max-width:1120px')
  })

  it('omits max-width when container is off, regardless of layout', () => {
    const html = buildHeaderPreview(data, {
      ...DEFAULT_HEADER_PRESENTATION,
      layout: 'spread',
      container: false,
    })
    expect(html).not.toContain('max-width:1120px')
  })
})
