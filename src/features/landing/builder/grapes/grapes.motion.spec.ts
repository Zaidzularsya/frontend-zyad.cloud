import grapesjs, { type Editor } from 'grapesjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const runtimes = vi.hoisted(
  () =>
    [] as Array<{
      root: HTMLElement
      start: ReturnType<typeof vi.fn>
      stop: ReturnType<typeof vi.fn>
      replay: ReturnType<typeof vi.fn>
      refresh: ReturnType<typeof vi.fn>
    }>,
)

// Runtime asli dibungkus spy: perilaku nyata tetap jalan, panggilan tercatat.
vi.mock('../../renderer/motion/page-runtime', async (orig) => {
  const actual = await orig<typeof import('../../renderer/motion/page-runtime')>()
  return {
    ...actual,
    createPageRuntime: vi.fn(
      (root: HTMLElement, env?: Parameters<typeof actual.createPageRuntime>[1]) => {
        const real = actual.createPageRuntime(root, env)
        const rec = {
          root,
          start: vi.fn(() => real.start()),
          stop: vi.fn(() => real.stop()),
          replay: vi.fn(() => real.replay()),
          refresh: vi.fn(() => real.refresh()),
        }
        runtimes.push(rec)
        return rec
      },
    ),
  }
})

import { REPLAY_ATTR, REPLAY_WINDOW_MS, attachCanvasMotion } from './grapes.motion'

let editor: Editor
let frame: HTMLIFrameElement

class FakeIO {
  static all: FakeIO[] = []
  constructor(public cb: IntersectionObserverCallback) {
    FakeIO.all.push(this)
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  runtimes.length = 0
  FakeIO.all = []
  frame = document.createElement('iframe')
  document.body.appendChild(frame)
  ;(frame.contentWindow as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    FakeIO
  editor = grapesjs.init({ headless: true, storageManager: false, components: '' } as never)
})

afterEach(() => {
  editor.destroy()
  frame.remove()
  vi.useRealTimers()
})

const loadFrame = () => editor.trigger('canvas:frame:load', { el: frame } as never)
// Meniru view GrapesJS: tulis HTML model ke body kanvas.
const paint = () => {
  frame.contentDocument!.body.innerHTML = editor
    .getHtml({ cleanId: true })
    .replace(/^<body[^>]*>|<\/body>$/g, '')
}

describe('attachCanvasMotion', () => {
  it('injects <style data-zy-motion> and creates the runtime on frame load', () => {
    attachCanvasMotion(editor)
    loadFrame()
    const doc = frame.contentDocument!
    const style = doc.head.querySelector('style[data-zy-motion]')
    expect(style).not.toBeNull()
    expect(style!.textContent).toContain('.zy-js')
    expect(runtimes).toHaveLength(1)
    expect(runtimes[0]!.root).toBe(doc.body)
    expect(runtimes[0]!.start).toHaveBeenCalledTimes(1)
    expect(doc.body.classList.contains('zy-js')).toBe(true)
  })

  it('does not duplicate the style or leave a live runtime when the frame reloads', () => {
    attachCanvasMotion(editor)
    loadFrame()
    loadFrame()
    expect(frame.contentDocument!.head.querySelectorAll('style[data-zy-motion]')).toHaveLength(1)
    expect(runtimes).toHaveLength(2)
    expect(runtimes[0]!.stop).toHaveBeenCalled()
  })

  it('replay() calls the runtime and raises the replaying flag only temporarily', () => {
    vi.useFakeTimers()
    const m = attachCanvasMotion(editor)
    loadFrame()
    const body = frame.contentDocument!.body
    m.replay()
    expect(runtimes[0]!.replay).toHaveBeenCalledTimes(1)
    expect(body.hasAttribute(REPLAY_ATTR)).toBe(true)
    vi.advanceTimersByTime(REPLAY_WINDOW_MS + 1)
    expect(body.hasAttribute(REPLAY_ATTR)).toBe(false)
  })

  it('replay() before the frame is ready is a no-op', () => {
    const m = attachCanvasMotion(editor)
    expect(() => m.replay()).not.toThrow()
    expect(runtimes).toHaveLength(0)
  })

  it('refreshes (coalesced) on component:add', async () => {
    attachCanvasMotion(editor)
    loadFrame()
    editor.addComponents('<p>a</p>')
    editor.addComponents('<p>b</p>')
    await Promise.resolve()
    expect(runtimes[0]!.refresh).toHaveBeenCalledTimes(1)
  })

  it('detach() stops the runtime, clears the flag and unsubscribes', async () => {
    const m = attachCanvasMotion(editor)
    loadFrame()
    m.replay()
    m.detach()
    expect(runtimes[0]!.stop).toHaveBeenCalled()
    const body = frame.contentDocument!.body
    expect(body.classList.contains('zy-js')).toBe(false)
    editor.addComponents('<p>x</p>')
    loadFrame()
    await Promise.resolve()
    expect(runtimes).toHaveLength(1)
    expect(runtimes[0]!.refresh).not.toHaveBeenCalled()
  })

  it('keeps edit-mode safe: un-revealed zy-anim elements are forced visible outside replay', () => {
    attachCanvasMotion(editor)
    loadFrame()
    const css = frame.contentDocument!.head.querySelector('style[data-zy-motion]')!.textContent!
    expect(css).toMatch(
      new RegExp(
        `body:not\\(\\[${REPLAY_ATTR}\\]\\)\\.zy-js \\[class\\*="zy-anim-"\\]:not\\(\\.is-in\\)`,
      ),
    )
    expect(css).toMatch(/opacity:\s*1\s*!important/)
  })

  it('getHtml()/getCss() stay free of runtime artifacts after the runtime runs', () => {
    editor.setComponents(
      `<section class="zy-stagger"><h1 class="zy-anim-fade-up zy-delay-200">Hai</h1>` +
        `<ul><li class="zy-anim-zoom-in">1</li><li>2</li></ul>` +
        `<b class="zy-count">1.200+</b><div class="zy-parallax-slow zy-tilt">p</div>` +
        `<div class="zy-marquee"><div class="zy-marquee__track"><span>A</span><span>B</span></div></div></section>`,
    )
    const htmlBefore = editor.getHtml()
    const cssBefore = editor.getCss()

    const m = attachCanvasMotion(editor)
    loadFrame()
    paint()
    m.refresh()
    return Promise.resolve().then(() => {
      const body = frame.contentDocument!.body
      // Runtime benar-benar bekerja di DOM kanvas...
      expect(body.classList.contains('zy-js')).toBe(true)
      expect(body.querySelectorAll('[data-zy-clone]').length).toBe(2)
      m.replay()
      // ...tetapi model/ekspor tidak berubah sama sekali.
      const html = editor.getHtml()
      expect(html).toBe(htmlBefore)
      expect(editor.getCss()).toBe(cssBefore)
      expect(html).not.toMatch(/zy-js|is-in|data-zy-|--zy-|aria-hidden/)
      expect(editor.getCss()).not.toMatch(/zy-js|--zy-/)
    })
  })
})
