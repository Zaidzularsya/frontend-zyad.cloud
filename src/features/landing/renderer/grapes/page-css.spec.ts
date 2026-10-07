import { describe, expect, it } from 'vitest'
import { rewritePageCss } from './page-css'

describe('rewritePageCss', () => {
  const r = (css: string) => rewritePageCss(css)

  it('maps html/body selectors to .zy-page', () => {
    expect(r('body{margin:0}').css).toContain('.zy-page{margin:0}')
    expect(r('html body .hero{color:red}').css).toContain('.zy-page .hero{color:red}')
    expect(r('body.dark{x:y}').css).toContain('.zy-page.dark{x:y}')
    expect(r('html, h1{a:b}').css).toMatch(/\.zy-page,\s*h1\{a:b\}/)
  })

  it('maps :root to :host', () => {
    expect(r(':root{--brand:#0EA5E9}').css).toContain(':host{--brand:#0EA5E9}')
  })

  it('leaves other selectors, ids, keyframes untouched', () => {
    const out = r('#i3k{color:red}.tbody{x:y}@keyframes f{from{opacity:0}to{opacity:1}}').css
    expect(out).toContain('#i3k{color:red}')
    expect(out).toContain('.tbody{x:y}')
    expect(out).toContain('@keyframes f')
    expect(out).toContain('from{opacity:0}')
  })

  it('rewrites inside @media', () => {
    expect(r('@media (max-width:768px){body{padding:0}}').css).toMatch(
      /@media \(max-width:\s?768px\)\s?\{\s*\.zy-page\{padding:0\}\s*\}/,
    )
  })

  it('extracts @font-face', () => {
    const res = r('@font-face{font-family:X;src:url(/f.woff2)}h1{font-family:X}')
    expect(res.fontFaces).toContain('@font-face')
    expect(res.css).not.toContain('@font-face')
    expect(res.css).toContain('h1{font-family:X}')
  })

  it('extracts @font-face nested in @media', () => {
    const res = r('@media screen{@font-face{font-family:Y;src:url(/y.woff2)}}')
    expect(res.fontFaces).toContain('font-family:Y')
    expect(res.css).not.toContain('@font-face')
  })

  it('still scrubs @import', () => {
    expect(r("@import url('https://e.test/x.css');p{a:b}").css).not.toContain('@import')
  })

  it('ignores braces inside strings and comments', () => {
    const out = r('/* } body{x:y} */ .a::after{content:"}{ body"}body{margin:0}').css
    expect(out).toContain('.a::after{content:"}{ body"}')
    expect(out).toContain('.zy-page{margin:0}')
    expect(out).not.toContain('body{margin')
  })

  it('does not split commas inside :is()/:not()', () => {
    const out = r('body :is(h1, h2){a:b}:not(body, .x) p{c:d}').css
    expect(out).toContain('.zy-page :is(h1, h2){a:b}')
    expect(out).toContain(':not(body, .x) p{c:d}')
  })

  it('rewrites a bare html selector and body > child', () => {
    expect(r('html{color:red}').css).toContain('.zy-page{color:red}')
    expect(r('body > .x{a:b}').css).toContain('.zy-page > .x{a:b}')
  })

  it('does not rewrite look-alike selectors', () => {
    const out = r('.body-x{a:b}#body{c:d}.tbody{e:f}body-x{g:h}.html{i:j}').css
    expect(out).toContain('.body-x{a:b}')
    expect(out).toContain('#body{c:d}')
    expect(out).toContain('.tbody{e:f}')
    expect(out).toContain('body-x{g:h}')
    expect(out).toContain('.html{i:j}')
    expect(out).not.toContain('.zy-page')
  })
})
