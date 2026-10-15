import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createPageRuntime,
  defaultRuntimeEnv,
  formatCount,
  parseCount,
  type RuntimeEnv,
} from './page-runtime'

// ---- mock IntersectionObserver: jsdom tidak punya, jadi callback disimpan agar bisa dipicu tes ----
interface MockObserver {
  cb: IntersectionObserverCallback
  options: IntersectionObserverInit | undefined
  observed: Element[]
  unobserved: Element[]
  disconnected: boolean
}
let observers: MockObserver[] = []

class MockIO {
  state: MockObserver
  constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.state = { cb, options, observed: [], unobserved: [], disconnected: false }
    observers.push(this.state)
  }
  observe(el: Element) {
    this.state.observed.push(el)
  }
  unobserve(el: Element) {
    this.state.unobserved.push(el)
    this.state.observed = this.state.observed.filter((e) => e !== el)
  }
  disconnect() {
    this.state.disconnected = true
    this.state.observed = []
  }
}

// ---- rAF manual: tes mengendalikan waktu frame ----
let frames = new Map<number, FrameRequestCallback>()
let frameId = 0
function flushFrames(ts: number) {
  const pending = [...frames.entries()]
  frames = new Map()
  for (const [, cb] of pending) cb(ts)
}

function fireIntersect(sel: string, isIntersecting: boolean, obs = 0, root?: HTMLElement) {
  const target = (root ?? document).querySelector(sel)!
  observers[obs]!.cb(
    [{ target, isIntersecting } as unknown as IntersectionObserverEntry],
    {} as IntersectionObserver,
  )
}

const mounted: HTMLElement[] = []
function html(markup: string): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = markup
  document.body.appendChild(root)
  mounted.push(root)
  return root
}

let env: RuntimeEnv

beforeEach(() => {
  observers = []
  frames = new Map()
  frameId = 0
  vi.stubGlobal('IntersectionObserver', MockIO)
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    frames.set(++frameId, cb)
    return frameId
  }) as typeof window.requestAnimationFrame
  window.cancelAnimationFrame = ((id: number) => {
    frames.delete(id)
  }) as typeof window.cancelAnimationFrame
  env = { reducedMotion: false, rich: true, win: window }
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  while (mounted.length) mounted.pop()!.remove()
})

describe('createPageRuntime', () => {
  it('does nothing under reduced motion', () => {
    const root = html('<div class="zy-anim-fade-up"></div><div class="zy-parallax-slow"></div>')
    const spy = vi.spyOn(window, 'addEventListener')
    const rt = createPageRuntime(root, { ...env, reducedMotion: true })
    rt.start()
    rt.refresh()
    expect(root.classList.contains('zy-js')).toBe(false)
    expect(observers.length).toBe(0)
    expect(spy).not.toHaveBeenCalled()
    expect(frames.size).toBe(0)
  })

  it('adds zy-js and reveals elements once when intersecting', () => {
    const root = html('<div id="a" class="zy-anim-fade-up"></div>')
    createPageRuntime(root, env).start()
    expect(root.classList.contains('zy-js')).toBe(true)
    expect(observers[0]!.options).toMatchObject({ threshold: 0.15, rootMargin: '0px 0px -8% 0px' })
    fireIntersect('#a', false)
    expect(root.querySelector('#a')!.classList.contains('is-in')).toBe(false)
    fireIntersect('#a', true)
    expect(root.querySelector('#a')!.classList.contains('is-in')).toBe(true)
    expect(observers[0]!.unobserved).toContain(root.querySelector('#a'))
  })

  it('does not observe the hero (one-shot css animation)', () => {
    const root = html('<h1 class="zy-anim-hero">x</h1>')
    createPageRuntime(root, env).start()
    expect(observers.flatMap((o) => o.observed)).toEqual([])
  })

  it('uses a single reveal observer for entrance and counters', () => {
    const root = html('<p class="zy-anim-fade-up"></p><b class="zy-count">10</b>')
    createPageRuntime(root, env).start()
    expect(observers.length).toBe(1)
    expect(observers[0]!.observed.length).toBe(2)
  })

  it('sets stagger index on direct children', () => {
    const root = html('<ul class="zy-stagger"><li></li><li></li><li></li></ul>')
    createPageRuntime(root, env).start()
    expect(
      [...root.querySelectorAll('li')].map((li) => li.style.getPropertyValue('--zy-stagger-i')),
    ).toEqual(['0', '1', '2'])
  })

  it('skips parallax/tilt listeners when not rich', () => {
    const spy = vi.spyOn(window, 'addEventListener')
    const root = html('<div class="zy-parallax-slow"></div><div class="zy-tilt"></div>')
    const tiltSpy = vi.spyOn(root.querySelector('.zy-tilt')!, 'addEventListener')
    createPageRuntime(root, { ...env, rich: false }).start()
    expect(spy.mock.calls.map((c) => c[0])).not.toContain('scroll')
    expect(tiltSpy).not.toHaveBeenCalled()
    expect(observers.length).toBe(0)
  })

  it('stop() removes listeners, disconnects observers and zy-js', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const rmSpy = vi.spyOn(window, 'removeEventListener')
    const root = html('<div class="zy-anim-fade-up"></div><div class="zy-parallax-slow"></div>')
    const rt = createPageRuntime(root, env)
    rt.start()
    expect(addSpy.mock.calls.map((c) => c[0])).toContain('scroll')
    rt.stop()
    expect(rmSpy.mock.calls.map((c) => c[0])).toContain('scroll')
    expect(observers.length).toBeGreaterThan(0)
    expect(observers.every((o) => o.disconnected)).toBe(true)
    expect(root.classList.contains('zy-js')).toBe(false)
  })

  it('start/stop repeatedly is safe and does not duplicate observers or clones', () => {
    const root = html(
      '<div class="zy-marquee"><div class="zy-marquee__track"><span>A</span><span>B</span></div></div><i class="zy-anim-fade-in"></i>',
    )
    const rt = createPageRuntime(root, env)
    rt.start()
    rt.start()
    expect(observers.length).toBe(1)
    rt.stop()
    rt.stop()
    expect(root.querySelectorAll('.zy-marquee__track > span').length).toBe(2)
    rt.start()
    expect(root.classList.contains('zy-js')).toBe(true)
    expect(root.querySelectorAll('.zy-marquee__track > span').length).toBe(4)
    expect(observers.filter((o) => !o.disconnected).length).toBe(1)
  })

  it('clones marquee children once with aria-hidden', () => {
    const root = html(
      '<div class="zy-marquee"><div class="zy-marquee__track"><span>A</span><span>B</span></div></div>',
    )
    const rt = createPageRuntime(root, env)
    rt.start()
    rt.refresh()
    const spans = root.querySelectorAll('.zy-marquee__track > span')
    expect(spans.length).toBe(4)
    expect(spans[2]!.getAttribute('aria-hidden')).toBe('true')
    expect(spans[0]!.getAttribute('aria-hidden')).toBeNull()
    expect(root.querySelector('.zy-marquee__track')!.hasAttribute('data-zy-cloned')).toBe(true)
  })

  it('marks marquee clones inert and strips ids, names and positive tabindex from the clone subtree', () => {
    const root = html(
      '<div class="zy-marquee"><div class="zy-marquee__track"><a id="x" href="#" tabindex="3"><input name="q" id="y"></a></div></div>',
    )
    const rt = createPageRuntime(root, env)
    rt.start()
    const kids = root.querySelectorAll('.zy-marquee__track > a')
    expect(kids.length).toBe(2)
    const clone = kids[1] as HTMLElement
    expect(clone.hasAttribute('inert')).toBe(true)
    expect(clone.querySelectorAll('[id]').length + (clone.hasAttribute('id') ? 1 : 0)).toBe(0)
    expect(clone.querySelector('[name]')).toBeNull()
    expect(clone.getAttribute('tabindex')).toBe('-1')
    expect(clone.querySelector('input')!.getAttribute('tabindex')).toBe('-1')
    // Aslinya tidak disentuh.
    const orig = kids[0] as HTMLElement
    expect(orig.id).toBe('x')
    expect(orig.getAttribute('tabindex')).toBe('3')
    expect(orig.hasAttribute('inert')).toBe(false)
  })

  it('refresh() observes only new elements', () => {
    const root = html('<div id="a" class="zy-anim-fade-up"></div>')
    const rt = createPageRuntime(root, env)
    rt.start()
    root.insertAdjacentHTML('beforeend', '<div id="b" class="zy-anim-zoom-in"></div>')
    rt.refresh()
    rt.refresh()
    const observed = observers[0]!.observed.map((e) => e.id)
    expect(observed).toEqual(['a', 'b'])
    expect(observers.length).toBe(1)
  })

  it('does not re-observe an element already revealed', () => {
    const root = html('<div id="a" class="zy-anim-fade-up"></div>')
    const rt = createPageRuntime(root, env)
    rt.start()
    fireIntersect('#a', true)
    rt.refresh()
    expect(observers[0]!.observed).toEqual([])
  })

  it('replay() removes is-in, observes again and replays the hero', () => {
    const root = html(
      '<h1 id="h" class="zy-anim-hero">x</h1><div id="a" class="zy-anim-fade-up"></div>',
    )
    const rt = createPageRuntime(root, env)
    rt.start()
    fireIntersect('#a', true)
    expect(root.querySelector('#a')!.classList.contains('is-in')).toBe(true)
    expect(observers[0]!.observed).toEqual([])

    const hero = root.querySelector('#h') as HTMLElement
    const seen: boolean[] = []
    const origRemove = hero.classList.remove.bind(hero.classList)
    vi.spyOn(hero.classList, 'remove').mockImplementation((...t: string[]) => {
      seen.push(t.includes('zy-anim-hero'))
      origRemove(...t)
    })
    rt.replay()
    expect(root.querySelector('#a')!.classList.contains('is-in')).toBe(false)
    const live = observers.filter((o) => !o.disconnected)
    expect(live.length).toBe(1)
    expect(live[0]!.observed.map((e) => e.id)).toEqual(['a'])
    expect(seen).toContain(true)
    expect(hero.classList.contains('zy-anim-hero')).toBe(true)
    fireIntersect('#a', true, observers.indexOf(live[0]!))
    expect(root.querySelector('#a')!.classList.contains('is-in')).toBe(true)
  })

  it('shows everything immediately when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const root = html(
      '<div id="a" class="zy-anim-fade-up"></div><ul class="zy-stagger zy-anim-fade-in"><li></li></ul><b class="zy-count">5</b>',
    )
    const rt = createPageRuntime(root, env)
    rt.start()
    expect(observers.length).toBe(0)
    for (const el of root.querySelectorAll('.zy-anim-fade-up, .zy-stagger, .zy-count')) {
      expect(el.classList.contains('is-in')).toBe(true)
    }
    expect(root.querySelector('.zy-count')!.textContent).toBe('5')
    rt.replay()
    expect(root.querySelector('#a')!.classList.contains('is-in')).toBe(true)
  })

  it('skips work for a count element whose text has no animatable number', () => {
    const root = html('<b id="c" class="zy-count">24/7</b>')
    createPageRuntime(root, env).start()
    fireIntersect('#c', true)
    expect(frames.size).toBe(0)
    expect(root.querySelector('#c')!.textContent).toBe('24/7')
    expect(root.querySelector('#c')!.classList.contains('is-in')).toBe(true)
  })
})

describe('counter', () => {
  it('animates up and ends exactly on the original text', () => {
    const root = html('<b id="c" class="zy-count">Rp1.200.000+</b>')
    createPageRuntime(root, env).start()
    const el = root.querySelector('#c') as HTMLElement
    fireIntersect('#c', true)
    flushFrames(1000) // t0
    expect(el.textContent).toBe('Rp0+')
    flushFrames(1600) // 600ms
    const mid = el.textContent!
    expect(mid.startsWith('Rp') && mid.endsWith('+')).toBe(true)
    expect(mid).not.toBe('Rp1.200.000+')
    flushFrames(2200) // 1200ms
    expect(el.textContent).toBe('Rp1.200.000+')
    expect(frames.size).toBe(0)
    expect(el.getAttribute('aria-label')).toBe('Rp1.200.000+')
  })

  it('keeps decimals and suffix (99,9%)', () => {
    const root = html('<b id="c" class="zy-count">99,9%</b>')
    createPageRuntime(root, env).start()
    fireIntersect('#c', true)
    flushFrames(0)
    flushFrames(300)
    expect(root.querySelector('#c')!.textContent).toMatch(/^\d{1,2},\d%$/)
    flushFrames(5000)
    expect(root.querySelector('#c')!.textContent).toBe('99,9%')
  })

  it('stop() cancels a running counter and restores the original text', () => {
    const root = html('<b id="c" class="zy-count">1.200</b>')
    const rt = createPageRuntime(root, env)
    rt.start()
    fireIntersect('#c', true)
    flushFrames(0)
    flushFrames(100)
    rt.stop()
    expect(frames.size).toBe(0)
    expect(root.querySelector('#c')!.textContent).toBe('1.200')
  })
})

describe('parallax', () => {
  function setup() {
    const root = html('<div id="p" class="zy-parallax-med"></div>')
    const el = root.querySelector('#p') as HTMLElement
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      top: 300,
      height: 200,
      left: 0,
      width: 100,
      right: 100,
      bottom: 500,
      x: 0,
      y: 300,
      toJSON() {},
    } as DOMRect)
    return { root, el }
  }

  it('throttles scroll writes through a single rAF and only for visible elements', () => {
    const { root, el } = setup()
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    const rt = createPageRuntime(root, env)
    rt.start()
    // observer kedua (threshold 0) melacak visibilitas parallax
    const vis = observers.find((o) => o.options?.threshold === 0)!
    expect(vis).toBeDefined()
    vis.cb(
      [{ target: el, isIntersecting: true } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    )
    flushFrames(0)
    el.style.removeProperty('--zy-progress')
    window.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('scroll'))
    expect(frames.size).toBe(1)
    flushFrames(16)
    // (800 - 300) / (800 + 200) = 0.5
    expect(el.style.getPropertyValue('--zy-progress')).toBe('0.500')
    rt.stop()
  })

  it('does not write progress for elements outside the viewport', () => {
    const { root, el } = setup()
    const rt = createPageRuntime(root, env)
    rt.start()
    window.dispatchEvent(new Event('scroll'))
    flushFrames(16)
    expect(el.style.getPropertyValue('--zy-progress')).toBe('')
    rt.stop()
  })

  it('stops reacting to scroll after stop()', () => {
    const { root } = setup()
    const rt = createPageRuntime(root, env)
    rt.start()
    rt.stop()
    window.dispatchEvent(new Event('scroll'))
    expect(frames.size).toBe(0)
  })
})

describe('parallax layout batching', () => {
  it('reads every rect before writing any style', () => {
    const root = html(
      '<div id="a" class="zy-parallax-med"></div><div id="b" class="zy-parallax-fast"></div>',
    )
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    const log: string[] = []
    for (const el of root.querySelectorAll<HTMLElement>('div')) {
      vi.spyOn(el, 'getBoundingClientRect').mockImplementation(() => {
        log.push('read')
        return {
          top: 300,
          height: 200,
          left: 0,
          width: 100,
          right: 100,
          bottom: 500,
          x: 0,
          y: 300,
          toJSON() {},
        } as DOMRect
      })
      const set = el.style.setProperty.bind(el.style)
      vi.spyOn(el.style, 'setProperty').mockImplementation((...a: [string, string | null]) => {
        log.push('write')
        return set(...a)
      })
    }
    const rt = createPageRuntime(root, env)
    rt.start()
    const vis = observers.find((o) => o.options?.threshold === 0)!
    vis.cb(
      [...root.querySelectorAll('div')].map((t) => ({ target: t, isIntersecting: true })) as never,
      {} as IntersectionObserver,
    )
    log.length = 0
    flushFrames(16)
    expect(log.filter((l) => l === 'read').length).toBe(2)
    expect(log.indexOf('write')).toBeGreaterThan(log.lastIndexOf('read'))
  })
})

describe('tilt', () => {
  function setup() {
    const root = html('<div id="t" class="zy-tilt"></div>')
    const el = root.querySelector('#t') as HTMLElement
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      left: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON() {},
    } as DOMRect)
    return { root, el }
  }
  const move = (el: HTMLElement, x: number, y: number) =>
    el.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y }))

  it('writes tilt at most +-6deg and resets on pointerleave', () => {
    const { root, el } = setup()
    createPageRuntime(root, env).start()
    move(el, 200, 0) // pojok kanan-atas: ekstrem
    expect(el.style.getPropertyValue('--zy-tilt-y')).toBe('6.00')
    expect(el.style.getPropertyValue('--zy-tilt-x')).toBe('6.00')
    move(el, 100, 50) // tengah
    expect(Number(el.style.getPropertyValue('--zy-tilt-y'))).toBe(0)
    move(el, 9999, -9999) // di luar elemen: tetap terjepit
    expect(Math.abs(Number(el.style.getPropertyValue('--zy-tilt-y')))).toBeLessThanOrEqual(6)
    expect(Math.abs(Number(el.style.getPropertyValue('--zy-tilt-x')))).toBeLessThanOrEqual(6)
    el.dispatchEvent(new Event('pointerleave'))
    expect(el.style.getPropertyValue('--zy-tilt-x')).toBe('0')
    expect(el.style.getPropertyValue('--zy-tilt-y')).toBe('0')
  })

  it('removes tilt listeners on stop()', () => {
    const { root, el } = setup()
    const rt = createPageRuntime(root, env)
    rt.start()
    rt.stop()
    move(el, 200, 0)
    expect(el.style.getPropertyValue('--zy-tilt-y')).toBe('')
  })
})

describe('defaultRuntimeEnv', () => {
  it('reads reduced-motion and rich media queries', () => {
    const win = {
      matchMedia: (q: string) => ({ matches: q.includes('reduce') }),
    } as unknown as Window
    expect(defaultRuntimeEnv(win)).toMatchObject({ reducedMotion: true, rich: false, win })
  })

  it('falls back safely when matchMedia is unavailable', () => {
    const win = {} as Window
    expect(defaultRuntimeEnv(win)).toMatchObject({ reducedMotion: false, rich: false })
  })
})

describe('parseCount', () => {
  it.each([
    ['1.200+', { prefix: '', value: 1200, suffix: '+', thousands: '.', decimals: 0 }],
    ['1.200', { prefix: '', value: 1200, suffix: '', thousands: '.', decimals: 0 }],
    ['Rp1.200.000', { prefix: 'Rp', value: 1200000, suffix: '', thousands: '.', decimals: 0 }],
    ['99,9%', { prefix: '', value: 99.9, suffix: '%', decimal: ',', decimals: 1 }],
    ['Rp 2,5 juta', { prefix: 'Rp ', value: 2.5, suffix: ' juta', decimal: ',', decimals: 1 }],
    ['500+', { prefix: '', value: 500, suffix: '+', thousands: '', decimals: 0 }],
    ['1.234,56', { value: 1234.56, thousands: '.', decimal: ',', decimals: 2 }],
    ['1,234,567', { value: 1234567, thousands: ',', decimals: 0 }],
    ['1,234.5', { value: 1234.5, thousands: ',', decimal: '.', decimals: 1 }],
    // heuristik ambiguitas: titik yang bukan pola ribuan = desimal titik
    ['1.5', { value: 1.5, decimal: '.', thousands: '', decimals: 1 }],
    ['99.9%', { value: 99.9, decimal: '.', decimals: 1, suffix: '%' }],
    // awalan 0 tidak pernah ribuan
    ['0.500', { value: 0.5, decimal: '.', decimals: 3 }],
  ])('parseCount(%s)', (text, expected) => expect(parseCount(text)).toMatchObject(expected))

  it.each(['24/7', 'Gratis', '', '1.2.3', '1,2,3', '10-20', '3 dari 5', '2024 - 2026'])(
    'parseCount returns null for %j',
    (text) => expect(parseCount(text)).toBeNull(),
  )

  it('treats a trailing period as suffix', () => {
    expect(parseCount('100.')).toMatchObject({ value: 100, suffix: '.' })
  })
})

describe('formatCount', () => {
  it('keeps the original format', () => {
    expect(formatCount(parseCount('Rp1.200.000')!, 600000)).toBe('Rp600.000')
    expect(formatCount(parseCount('Rp1.200.000')!, 1200000)).toBe('Rp1.200.000')
    expect(formatCount(parseCount('99,9%')!, 50.04)).toBe('50,0%')
    expect(formatCount(parseCount('1.234,56')!, 1234.56)).toBe('1.234,56')
    expect(formatCount(parseCount('1,234.5')!, 999.9)).toBe('999.9')
    expect(formatCount(parseCount('500+')!, 123.4)).toBe('123+')
    expect(formatCount(parseCount('2,5 juta')!, 0)).toBe('0,0 juta')
  })
})
