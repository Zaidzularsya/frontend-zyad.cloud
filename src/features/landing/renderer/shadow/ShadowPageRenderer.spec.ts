import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { defineComponent, h } from 'vue'

import { useLandingPageContext, type LandingPageContext } from './page-context'
import ShadowPageRenderer from './ShadowPageRenderer.vue'
import { SLOT_REGISTRY } from './slot-registry'

const push = vi.fn()
// Mock resolve: /media/* tanpa route, /nowhere* jatuh ke catch-all, selain itu route nyata.
const resolve = (path: string) => ({
  matched: path.startsWith('/media')
    ? []
    : [{ path: path.startsWith('/nowhere') ? '/:pathMatch(.*)*' : path }],
})
vi.mock('vue-router', () => ({ useRouter: () => ({ push, resolve }) }))

// Runtime asli dibungkus spy: perilaku nyata tetap jalan, panggilan start/stop tercatat.
const rt = vi.hoisted(() => ({ created: [] as Array<{ stop: () => void; start: () => void }> }))
vi.mock('../motion/page-runtime', async (orig) => {
  const actual = await orig<typeof import('../motion/page-runtime')>()
  return {
    ...actual,
    createPageRuntime: vi.fn((root: HTMLElement, env?: never) => {
      const real = actual.createPageRuntime(root, env)
      const rec = {
        start: vi.fn(() => real.start()),
        stop: vi.fn(() => real.stop()),
        replay: real.replay,
        refresh: vi.fn(() => real.refresh()),
      }
      rt.created.push(rec)
      return rec
    }),
  }
})
import { createPageRuntime } from '../motion/page-runtime'

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
  vi.mocked(createPageRuntime).mockClear()
  rt.created.length = 0
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
    const css = host(w).shadowRoot!.innerHTML.replace(/\s+/g, '')
    expect(css).toContain(':host{all:initial;display:block;}')
    expect(css).toContain(':where(.zy-page)*::after{box-sizing:border-box;}')
    expect(css).not.toMatch(/(^|[};])\.zy-page\*/)
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

  it('keeps history.state (vue-router) when updating the hash', async () => {
    history.replaceState({ back: '/x', position: 3 }, '', '/')
    const w = mountRenderer({
      html: '<a id="go" href="#harga">h</a><section id="harga"></section>',
      css: '',
    })
    await flushPromises()
    click(host(w).shadowRoot!.getElementById('go')!)
    expect(history.state).toEqual({ back: '/x', position: 3 })
  })

  it('routes same-origin links through the router', async () => {
    const w = mountRenderer({ html: '<a id="a" href="/auth/register">m</a>', css: '' })
    await flushPromises()
    const ev = click(host(w).shadowRoot!.getElementById('a')!)
    expect(push).toHaveBeenCalledWith('/auth/register')
    expect(ev.prevented).toBe(true)
  })

  it('leaves links without an app route to the browser', async () => {
    const w = mountRenderer({
      html: '<a id="a" href="/media/x.pdf">p</a><a id="b" href="/nowhere/else">q</a>',
      css: '',
    })
    await flushPromises()
    const root = host(w).shadowRoot!
    const pdf = click(root.getElementById('a')!)
    const catchAll = click(root.getElementById('b')!)
    expect(push).not.toHaveBeenCalled()
    expect(pdf.prevented).toBe(false)
    expect(catchAll.prevented).toBe(false)
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

  describe('motion runtime', () => {
    const rts = () => rt.created as unknown as Array<{ start: Mock; stop: Mock; refresh: Mock }>

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('ships zy-motion.css in the platform stylesheet (.zy-js)', () => {
      const w = mountRenderer({ html: '<p>a</p>', css: '' })
      const css = host(w).shadowRoot!.querySelector('style')!.textContent!
      expect(css).toContain('.zy-js')
      expect(css).toContain('.zy-anim-fade-up')
    })

    it('creates and starts the runtime once on div.zy-page after mount (slots included)', async () => {
      const w = mountRenderer({
        html: `<h1 class="zy-anim-fade-up">a</h1>${FOOTER_HTML}`,
        css: '',
        chrome: { footer: FOOTER },
      })
      await flushPromises()
      const root = host(w).shadowRoot!
      expect(createPageRuntime).toHaveBeenCalledTimes(1)
      expect(vi.mocked(createPageRuntime).mock.calls[0]![0]).toBe(root.querySelector('.zy-page'))
      expect(rts()[0]!.start).toHaveBeenCalledTimes(1)
      // Slot sudah ter-mount saat runtime menyala.
      expect(root.querySelector('.zyad-tenant-footer')).not.toBeNull()
      expect(root.querySelector('.zy-page')!.classList.contains('zy-js')).toBe(true)
    })

    it('stops the runtime when html changes, then starts a fresh one', async () => {
      const w = mountRenderer({ html: '<p class="zy-anim-fade-up">a</p>', css: '' })
      await flushPromises()
      const first = rts()[0]!
      await w.setProps({ html: '<p class="zy-anim-fade-up">b</p>' })
      await flushPromises()
      expect(first.stop).toHaveBeenCalled()
      expect(rts()).toHaveLength(2)
      expect(rts()[1]!.start).toHaveBeenCalledTimes(1)
    })

    it('does not start the runtime twice for back-to-back changes', async () => {
      const w = mountRenderer({ html: '<p>satu</p>', css: '' })
      await flushPromises()
      void w.setProps({ html: '<p>dua</p>' })
      await w.setProps({ html: '<p>tiga</p>' })
      await flushPromises()
      // 1 untuk render awal + 1 untuk render terakhir; render "dua" yang tersela tidak menyala.
      expect(rts()).toHaveLength(2)
      const alive = rts().filter((r) => r.start.mock.calls.length > r.stop.mock.calls.length)
      expect(alive).toHaveLength(1)
    })

    it('stops the runtime on unmount and ignores a render that settles afterwards', async () => {
      const w = mountRenderer({ html: '<p>a</p>', css: '' })
      await flushPromises()
      const first = rts()[0]!
      void w.setProps({ html: '<p>b</p>' })
      mounted.pop()!.unmount()
      await flushPromises()
      expect(first.stop).toHaveBeenCalled()
      expect(rts()).toHaveLength(1)
    })

    it('refreshes when a slot adds elements after the runtime started', async () => {
      const w = mountRenderer({ html: '<p class="zy-anim-fade-up">a</p>', css: '' })
      await flushPromises()
      const page = host(w).shadowRoot!.querySelector('.zy-page')!
      page.appendChild(document.createElement('div'))
      await flushPromises()
      expect(rts()[0]!.refresh).toHaveBeenCalled()
    })

    it('installs nothing under prefers-reduced-motion', async () => {
      vi.stubGlobal(
        'matchMedia',
        (q: string) =>
          ({ matches: q.includes('prefers-reduced-motion'), media: q }) as MediaQueryList,
      )
      const mo = vi.spyOn(window, 'MutationObserver')
      const w = mountRenderer({ html: '<p class="zy-anim-fade-up">a</p>', css: '' })
      await flushPromises()
      expect(createPageRuntime).not.toHaveBeenCalled()
      expect(mo).not.toHaveBeenCalled()
      expect(host(w).shadowRoot!.querySelector('.zy-page')!.classList.contains('zy-js')).toBe(false)
      mo.mockRestore()
    })
  })

  describe('page context', () => {
    let ctx: LandingPageContext | null = null
    beforeEach(() => {
      ctx = null
      SLOT_REGISTRY['ctx-probe'] = {
        css: '',
        component: defineComponent({
          setup() {
            ctx = useLandingPageContext()
            return () => h('span', 'probe')
          },
        }),
      }
    })
    afterEach(() => {
      delete SLOT_REGISTRY['ctx-probe']
    })

    it('provides orgType that follows chrome and scrollToId that updates the hash', async () => {
      history.replaceState({ back: '/x' }, '', '/')
      const w = mountRenderer({
        html: '<div data-zyad-slot="ctx-probe"></div><section id="harga"></section>',
        css: '',
        chrome: { orgType: 'platform' },
      })
      await flushPromises()
      expect(ctx!.orgType.value).toBe('platform')
      await w.setProps({ chrome: { orgType: 'customer' } })
      expect(ctx!.orgType.value).toBe('customer')

      const root = host(w).shadowRoot!
      ctx!.scrollToId('harga')
      expect(root.getElementById('harga')!.scrollIntoView).toHaveBeenCalled()
      expect(location.hash).toBe('#harga')
      expect(history.state).toEqual({ back: '/x' })
      expect(() => ctx!.scrollToId('tidak-ada')).not.toThrow()
      expect(location.hash).toBe('#harga')
    })
  })
})
