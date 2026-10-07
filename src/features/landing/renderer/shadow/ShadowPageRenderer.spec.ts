import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ShadowPageRenderer from './ShadowPageRenderer.vue'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

const FONT_CSS = '@font-face{font-family:X;src:url(/f.woff2)}'
const FOOTER = { brandName: 'Zyad', columns: [] }
const FOOTER_HTML = '<div data-zyad-slot="tenant-footer"></div>'

const mounted: VueWrapper[] = []
function mountRenderer(props: Record<string, unknown>) {
  const w = mount(ShadowPageRenderer, { props: props as never, attachTo: document.body })
  mounted.push(w)
  return w
}
const host = (w: VueWrapper) => w.get('.zy-page-host').element as HTMLElement
const fontStyles = () => document.head.querySelectorAll('style[data-zy-fonts]')

// jsdom tidak mengimplementasi navigasi; listener di document mencatat apakah renderer
// sudah memanggil preventDefault, lalu membatalkan navigasi supaya tidak berisik.
function click(el: Element, init: MouseEventInit = {}) {
  const ev = new MouseEvent('click', { bubbles: true, composed: true, cancelable: true, ...init })
  let prevented = false
  const record = (e: Event) => {
    prevented = e.defaultPrevented
    e.preventDefault()
  }
  document.addEventListener('click', record)
  el.dispatchEvent(ev)
  document.removeEventListener('click', record)
  return { prevented }
}

beforeEach(() => {
  push.mockClear()
  Element.prototype.scrollIntoView = vi.fn()
  history.replaceState(null, '', '/')
})

afterEach(() => {
  while (mounted.length) mounted.pop()!.unmount()
  document.head.querySelectorAll('style[data-zy-fonts]').forEach((n) => n.remove())
})

describe('ShadowPageRenderer', () => {
  it('renders sanitized html inside an open shadow root', () => {
    const w = mountRenderer({
      html: '<h1 onclick="x()">Hai</h1><script>alert(1)</script>',
      css: '',
    })
    const root = host(w).shadowRoot!
    expect(root.querySelector('.zy-page h1')?.textContent).toBe('Hai')
    expect(root.innerHTML).not.toContain('<script>')
    expect(root.innerHTML).not.toContain('onclick')
  })

  it('exposes the aria label and shadowRoot()', () => {
    const w = mountRenderer({ html: '<p>a</p>', css: '', title: 'Beranda' })
    expect(host(w).getAttribute('aria-label')).toBe('Beranda')
    expect(host(w).getAttribute('role')).toBe('document')
    expect((w.vm as unknown as { shadowRoot(): ShadowRoot | null }).shadowRoot()).toBe(
      host(w).shadowRoot,
    )
  })

  it('isolates from inherited SPA styles', () => {
    const w = mountRenderer({ html: '<p>a</p>', css: '' })
    // base.css diformat prettier (multi-baris): bandingkan tanpa whitespace.
    expect(host(w).shadowRoot!.innerHTML.replace(/\s+/g, '')).toContain(
      ':host{all:initial;display:block;}',
    )
  })

  it('applies rewritten page css', () => {
    const w = mountRenderer({ html: '<p>a</p>', css: 'body{background:#000}' })
    expect(host(w).shadowRoot!.innerHTML).toContain('.zy-page{background:#000}')
  })

  it('mounts footer slot into the first sentinel and drops duplicates', async () => {
    const html = `${FOOTER_HTML}${FOOTER_HTML}`
    const w = mountRenderer({ html, css: '', chrome: { footer: FOOTER } })
    await flushPromises()
    const root = host(w).shadowRoot!
    expect(root.querySelectorAll('[data-zyad-slot="tenant-footer"]').length).toBe(1)
    expect(root.querySelector('.zyad-tenant-footer__brand')?.textContent).toContain('Zyad')
  })

  it('leaves sentinels with an unknown slot name untouched', async () => {
    const w = mountRenderer({
      html: '<div data-zyad-slot="mystery"><b>x</b></div>',
      css: '',
    })
    await flushPromises()
    expect(host(w).shadowRoot!.querySelector('[data-zyad-slot="mystery"] b')).not.toBeNull()
  })

  it('scrolls to in-page anchors and updates the hash', async () => {
    const w = mountRenderer({
      html: '<a id="go" href="#harga">h</a><section id="harga"></section>',
      css: '',
    })
    await flushPromises()
    const root = host(w).shadowRoot!
    click(root.getElementById('go')!)
    expect(root.getElementById('harga')!.scrollIntoView).toHaveBeenCalled()
    expect(location.hash).toBe('#harga')
  })

  it('routes same-origin links through the router', async () => {
    const w = mountRenderer({ html: '<a id="a" href="/auth/register">m</a>', css: '' })
    await flushPromises()
    const ev = click(host(w).shadowRoot!.getElementById('a')!)
    expect(push).toHaveBeenCalledWith('/auth/register')
    expect(ev.prevented).toBe(true)
  })

  it('does not hijack ctrl-click, middle-click or target=_blank', async () => {
    const w = mountRenderer({
      html: '<a id="a" href="/auth/register">m</a><a id="b" href="/x" target="_blank">n</a>',
      css: '',
    })
    await flushPromises()
    const root = host(w).shadowRoot!
    const ctrl = click(root.getElementById('a')!, { ctrlKey: true })
    const middle = click(root.getElementById('a')!, { button: 1 })
    const blank = click(root.getElementById('b')!)
    expect(push).not.toHaveBeenCalled()
    expect(ctrl.prevented).toBe(false)
    expect(middle.prevented).toBe(false)
    expect(blank.prevented).toBe(false)
  })

  it('keeps target on links (same as the iframe renderer)', () => {
    const w = mountRenderer({ html: '<a id="b" href="/x" target="_blank">n</a>', css: '' })
    expect(host(w).shadowRoot!.getElementById('b')!.getAttribute('target')).toBe('_blank')
  })

  it('never leaves a javascript: href in the shadow root and never routes it', async () => {
    const w = mountRenderer({ html: '<a id="j" href="javascript:alert(1)">x</a>', css: '' })
    await flushPromises()
    const root = host(w).shadowRoot!
    expect(root.innerHTML.toLowerCase()).not.toContain('javascript:')
    click(root.getElementById('j')!)
    expect(push).not.toHaveBeenCalled()
  })

  it('scrolls to location.hash after the first render', async () => {
    history.replaceState(null, '', '/#harga')
    const w = mountRenderer({ html: '<section id="harga"></section>', css: '' })
    await flushPromises()
    expect(host(w).shadowRoot!.getElementById('harga')!.scrollIntoView).toHaveBeenCalled()
  })

  it('hoists @font-face to head and removes it on unmount', async () => {
    const w = mountRenderer({ html: '<p>a</p>', css: FONT_CSS })
    await flushPromises()
    expect(fontStyles().length).toBe(1)
    mounted.pop()!.unmount()
    expect(fontStyles().length).toBe(0)
    void w
  })

  it('replaces content, slots and fonts when html changes', async () => {
    const w = mountRenderer({
      html: `<p>lama</p>${FOOTER_HTML}`,
      css: FONT_CSS,
      chrome: { footer: FOOTER },
    })
    await flushPromises()
    expect(host(w).shadowRoot!.querySelector('.zyad-tenant-footer')).not.toBeNull()
    expect(fontStyles().length).toBe(1)

    await w.setProps({ html: '<p>baru</p>', css: 'p{color:red}' })
    await flushPromises()
    const root = host(w).shadowRoot!
    expect(root.querySelector('.zyad-tenant-footer')).toBeNull()
    expect(fontStyles().length).toBe(0)
    expect(root.querySelectorAll('.zy-page').length).toBe(1)
    expect(root.querySelectorAll('.zy-page p').length).toBe(1)
    expect(root.querySelector('.zy-page p')!.textContent).toBe('baru')
  })

  it('survives back-to-back html/css changes without leftovers (SPA slug switch)', async () => {
    const w = mountRenderer({
      html: `<p>satu</p>${FOOTER_HTML}`,
      css: FONT_CSS,
      chrome: { footer: FOOTER },
    })
    await flushPromises()

    // Dua perubahan berturut-turut tanpa menunggu tick di antaranya.
    void w.setProps({ html: `<p>dua</p>${FOOTER_HTML}`, css: FONT_CSS })
    await w.setProps({ html: `<p>tiga</p>${FOOTER_HTML}`, css: FONT_CSS })
    await flushPromises()

    const root = host(w).shadowRoot!
    expect(root.querySelectorAll('.zy-page').length).toBe(1)
    expect(root.querySelectorAll('.zy-page p').length).toBe(1)
    expect(root.querySelector('.zy-page p')!.textContent).toBe('tiga')
    expect(root.querySelectorAll('.zyad-tenant-footer').length).toBe(1)
    expect(fontStyles().length).toBe(1)

    await w.setProps({ html: '<p>empat</p>', css: '' })
    await flushPromises()
    expect(root.querySelectorAll('.zyad-tenant-footer').length).toBe(0)
    expect(fontStyles().length).toBe(0)
  })

  it('does not leave a font style in head when unmounted before the re-render settles', async () => {
    const w = mountRenderer({
      html: `<p>a</p>${FOOTER_HTML}`,
      css: FONT_CSS,
      chrome: { footer: FOOTER },
    })
    await flushPromises()
    expect(fontStyles().length).toBe(1)

    void w.setProps({ html: `<p>b</p>${FOOTER_HTML}`, css: FONT_CSS })
    mounted.pop()!.unmount()
    await flushPromises()
    expect(fontStyles().length).toBe(0)
  })
})
