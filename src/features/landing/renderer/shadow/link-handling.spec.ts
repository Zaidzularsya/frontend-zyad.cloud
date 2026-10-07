import { describe, expect, it } from 'vitest'
import { classifyLinkClick, hasAppRoute, type ClickInfo } from './link-handling'

const plain: ClickInfo = {
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  defaultPrevented: false,
}
const here = 'https://zyad.cloud/'

describe('classifyLinkClick', () => {
  it('hash on same page → hash', () => {
    expect(classifyLinkClick(plain, '#harga', null, false, here)).toEqual({
      kind: 'hash',
      id: 'harga',
    })
    expect(classifyLinkClick(plain, '/#harga', null, false, here)).toEqual({
      kind: 'hash',
      id: 'harga',
    })
  })

  it('decodes percent-encoded hash', () => {
    expect(classifyLinkClick(plain, '#harga%20kami', null, false, here)).toEqual({
      kind: 'hash',
      id: 'harga kami',
    })
  })

  it('same-origin path → route', () => {
    expect(classifyLinkClick(plain, '/auth/register?redirect=%2Fapp', null, false, here)).toEqual({
      kind: 'route',
      path: '/auth/register?redirect=%2Fapp',
    })
  })

  it('/apix is still a route, only /api/ prefix is native', () => {
    expect(classifyLinkClick(plain, '/apix', null, false, here)).toEqual({
      kind: 'route',
      path: '/apix',
    })
    expect(classifyLinkClick(plain, '/api', null, false, here)).toEqual({ kind: 'native' })
  })

  it('hash on a different path → route (keeps hash)', () => {
    expect(classifyLinkClick(plain, '/lain#harga', null, false, here)).toEqual({
      kind: 'route',
      path: '/lain#harga',
    })
  })

  it.each([
    ['modifier ctrl', { ...plain, ctrlKey: true }, '/x', null, false],
    ['modifier meta', { ...plain, metaKey: true }, '/x', null, false],
    ['modifier shift', { ...plain, shiftKey: true }, '/x', null, false],
    ['modifier alt', { ...plain, altKey: true }, '/x', null, false],
    ['middle button', { ...plain, button: 1 }, '/x', null, false],
    ['new tab', plain, '/x', '_blank', false],
    ['download', plain, '/f.pdf', null, true],
    ['external', plain, 'https://other.id/x', null, false],
    ['mailto', plain, 'mailto:a@b.id', null, false],
    ['api path', plain, '/api/v1/x', null, false],
    ['already prevented', { ...plain, defaultPrevented: true }, '/x', null, false],
    ['empty hash', plain, '#', null, false],
    ['null href', plain, null, null, false],
    ['empty href', plain, '', null, false],
    ['invalid url', plain, 'http://', null, false],
  ])('%s → native', (_n, click, href, target, dl) => {
    expect(
      classifyLinkClick(
        click as ClickInfo,
        href as string | null,
        target as string | null,
        dl as boolean,
        here,
      ),
    ).toEqual({ kind: 'native' })
  })

  it('invalid currentUrl does not throw', () => {
    expect(classifyLinkClick(plain, '/x', null, false, 'bukan url')).toEqual({ kind: 'native' })
  })
})

describe('hasAppRoute', () => {
  it('true only for a non catch-all match', () => {
    expect(hasAppRoute([{ path: '/auth/register' }])).toBe(true)
    expect(hasAppRoute([])).toBe(false)
    expect(hasAppRoute([{ path: '/:pathMatch(.*)*' }])).toBe(false)
  })
})
