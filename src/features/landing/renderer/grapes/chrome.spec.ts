import { describe, expect, it } from 'vitest'
import { readHeaderPresentation, safeHref } from './chrome'

describe('readHeaderPresentation', () => {
  it('returns defaults for null / invalid JSON', () => {
    for (const raw of [null, '{bad']) {
      const p = readHeaderPresentation(raw)
      expect(p).toMatchObject({
        position: 'sticky',
        variant: 'solid',
        layout: 'grouped',
        groupAlign: 'left',
        container: true,
        showAction: true,
        actionLabel: 'Masuk',
        actionUrl: '/login',
        hideOnScroll: false,
        brandColor: '#0f172a',
        navColor: '#475569',
      })
    }
  })
  it('migrates legacy sticky/align', () => {
    const p = readHeaderPresentation('{"sticky":false,"align":"center"}')
    expect(p.position).toBe('static')
    expect(p.groupAlign).toBe('center')
  })
  it('rejects unsafe colors', () => {
    expect(readHeaderPresentation('{"brandColor":"red;background:url(x)"}').brandColor).toBe(
      '#0f172a',
    )
  })
})

describe('safeHref', () => {
  it.each([
    ['javascript:alert(1)', '#'],
    ['//evil.test', '#'],
    ['/harga', '/harga'],
    ['#harga', '#harga'],
    ['https://a.id', 'https://a.id'],
    ['', '#'],
  ])('%s → %s', (i, o) => {
    expect(safeHref(i)).toBe(o)
  })
})
