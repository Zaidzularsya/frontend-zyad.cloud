/**
 * Runtime animasi halaman (MOTION 3). Tanpa dependency.
 *
 * Prinsip:
 * - Konten tidak boleh tersembunyi bila runtime gagal: state awal tersembunyi hanya berlaku di
 *   bawah `.zy-js` (dipasang di sini), dan tanpa IntersectionObserver semua elemen langsung `is-in`.
 * - `prefers-reduced-motion` -> `start()` tidak memasang apa pun.
 * - Semua pekerjaan terbatas pada `contentRoot`; satu-satunya hal di luar itu adalah listener
 *   `scroll` pada `env.win`, yang dilepas di `stop()`.
 */

export interface RuntimeEnv {
  reducedMotion: boolean
  /** (hover: hover) and (min-width: 768px): parallax, tilt, scale-in-scroll hanya aktif bila true */
  rich: boolean
  /** Sumber scroll / rAF / IntersectionObserver */
  win: Window
}

export function defaultRuntimeEnv(win: Window = window): RuntimeEnv {
  const mq = (q: string): boolean =>
    typeof win.matchMedia === 'function' ? win.matchMedia(q).matches : false
  return {
    reducedMotion: mq('(prefers-reduced-motion: reduce)'),
    rich: mq('(hover: hover) and (min-width: 768px)'),
    win,
  }
}

export interface PageRuntime {
  start(): void
  stop(): void
  replay(): void
  refresh(): void
}

// ---------------------------------------------------------------------------------------------
// Counter: parse / format angka berformat Indonesia
// ---------------------------------------------------------------------------------------------

export interface ParsedCount {
  prefix: string
  value: number
  decimals: number
  suffix: string
  thousands: '.' | ',' | ''
  decimal: ',' | '.'
}

const NUMBER_TOKEN = /\d+(?:[.,]\d+)*/
const DOT_THOUSANDS = /^[1-9]\d{0,2}(?:\.\d{3})+$/
const COMMA_THOUSANDS = /^[1-9]\d{0,2}(?:,\d{3})+$/

/**
 * Heuristik (urut):
 *  1. `1.200`, `1.200.000`            -> titik = pemisah ribuan (pola `\d{1,3}(\.\d{3})+`, tidak diawali 0)
 *  2. `1.234,56`                      -> titik ribuan + koma desimal
 *  3. `99,9`, `2,5`                   -> koma = desimal (format Indonesia)
 *  4. `1,234,567`                     -> koma berulang dengan grup 3 digit = ribuan (gaya Inggris)
 *  5. `1,234.5`                       -> koma ribuan + titik desimal
 *  6. `1.5`, `99.9`, `0.500`         -> titik yang BUKAN pola ribuan = desimal titik
 *  Yang lain (`1.2.3`, `1,2,3`) dianggap ambigu -> null. Catatan: `1.500` selalu dibaca 1500.
 *  Teks yang punya angka di prefix/sufiks (`24/7`, `3 dari 5`) -> null.
 */
export function parseCount(text: string): ParsedCount | null {
  const m = NUMBER_TOKEN.exec(text)
  if (!m) return null
  const prefix = text.slice(0, m.index)
  const suffix = text.slice(m.index + m[0].length)
  if (/\d/.test(prefix) || /\d/.test(suffix)) return null

  const token = m[0]
  let thousands: ParsedCount['thousands'] = ''
  let decimal: ParsedCount['decimal'] = ','
  let intPart = token
  let fracPart = ''

  if (/^\d+$/.test(token)) {
    // bilangan bulat polos
  } else if (DOT_THOUSANDS.test(token)) {
    thousands = '.'
    intPart = token.replace(/\./g, '')
  } else if (/^[1-9]\d{0,2}(?:\.\d{3})+,\d+$/.test(token)) {
    thousands = '.'
    const [i = '', f = ''] = token.split(',')
    intPart = i.replace(/\./g, '')
    fracPart = f
  } else if (/^\d+,\d+$/.test(token)) {
    const [i = '', f = ''] = token.split(',')
    intPart = i
    fracPart = f
  } else if (COMMA_THOUSANDS.test(token)) {
    thousands = ','
    decimal = '.'
    intPart = token.replace(/,/g, '')
  } else if (/^[1-9]\d{0,2}(?:,\d{3})+\.\d+$/.test(token)) {
    thousands = ','
    decimal = '.'
    const [i = '', f = ''] = token.split('.')
    intPart = i.replace(/,/g, '')
    fracPart = f
  } else if (/^\d+\.\d+$/.test(token)) {
    decimal = '.'
    const [i = '', f = ''] = token.split('.')
    intPart = i
    fracPart = f
  } else {
    return null
  }

  const value = Number(fracPart ? `${intPart}.${fracPart}` : intPart)
  if (!Number.isFinite(value)) return null
  return { prefix, value, decimals: fracPart.length, suffix, thousands, decimal }
}

export function formatCount(p: ParsedCount, value: number): string {
  const fixed = Math.max(0, value).toFixed(p.decimals)
  const [intRaw = '0', frac = ''] = fixed.split('.')
  const int = p.thousands ? intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, p.thousands) : intRaw
  return `${p.prefix}${int}${frac ? p.decimal + frac : ''}${p.suffix}`
}

// ---------------------------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------------------------

const REVEAL_OPTIONS = { threshold: 0.15, rootMargin: '0px 0px -8% 0px' } as const
const COUNTER_MS = 1200
const TILT_MAX = 6
const HERO = 'zy-anim-hero'

const hasClassPrefix = (el: Element, prefix: string, except?: string): boolean =>
  [...el.classList].some((c) => c.startsWith(prefix) && c !== except)

const isAnim = (el: Element) => hasClassPrefix(el, 'zy-anim-', HERO)
const isScrollDriven = (el: Element) =>
  el.classList.contains('zy-scale-in-scroll') || hasClassPrefix(el, 'zy-parallax-')

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

type IOCtor = typeof IntersectionObserver

export function createPageRuntime(contentRoot: HTMLElement, env?: RuntimeEnv): PageRuntime {
  const e = env ?? defaultRuntimeEnv()
  const win = e.win as Window & typeof globalThis

  let started = false
  let reveal: IntersectionObserver | null = null
  let visibility: IntersectionObserver | null = null
  let scrollBound = false
  let scrollRaf = 0
  let watched = new WeakSet<Element>() // sudah diamati / sudah ditangani
  const scrollEls = new Set<HTMLElement>()
  const visible = new Set<HTMLElement>()
  const tilts = new Map<HTMLElement, { move: (ev: PointerEvent) => void; leave: () => void }>()
  const counters = new Map<HTMLElement, { raf: number; original: string }>()
  const clonedTracks = new Set<HTMLElement>()

  const ioAvailable = (): boolean =>
    typeof (win as { IntersectionObserver?: IOCtor }).IntersectionObserver === 'function'

  // ----- reveal -----
  function revealEl(el: Element): void {
    el.classList.add('is-in')
    if (el.classList.contains('zy-count')) runCounter(el as HTMLElement)
  }

  function onReveal(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      revealEl(entry.target)
      reveal?.unobserve(entry.target)
    }
  }

  function runCounter(el: HTMLElement): void {
    if (counters.has(el) || el.children.length > 0) return
    const original = el.textContent ?? ''
    const parsed = parseCount(original.trim())
    if (!parsed) return
    // Teks asli tetap tersedia untuk SEO/AT; yang beranimasi hanya teks tampilan.
    el.setAttribute('aria-label', original.trim())
    el.setAttribute('data-zy-count-final', original.trim())
    // Jaga lebar stabil: angka tabular + lebar minimum selebar teks akhir.
    el.style.fontVariantNumeric = 'tabular-nums'
    el.style.minWidth = `${original.trim().length}ch`
    const state = { raf: 0, original }
    counters.set(el, state)
    let t0 = -1
    const finish = () => {
      el.textContent = original
      el.style.removeProperty('font-variant-numeric')
      el.style.removeProperty('min-width')
      counters.delete(el)
    }
    const step = (ts: number) => {
      if (t0 < 0) t0 = ts
      const p = clamp((ts - t0) / COUNTER_MS, 0, 1)
      if (p >= 1) return finish()
      const eased = 1 - Math.pow(1 - p, 3)
      el.textContent = formatCount(parsed, parsed.value * eased)
      state.raf = win.requestAnimationFrame(step)
    }
    state.raf = win.requestAnimationFrame(step)
  }

  function cancelCounters(): void {
    for (const [el, st] of counters) {
      win.cancelAnimationFrame(st.raf)
      el.textContent = st.original
      el.style.removeProperty('font-variant-numeric')
      el.style.removeProperty('min-width')
    }
    counters.clear()
  }

  // ----- scroll-driven (parallax / scale-in-scroll) -----
  function updateProgress(): void {
    scrollRaf = 0
    const vh = win.innerHeight || 0
    // Baca semua rect dulu, baru tulis style: menghindari layout thrash antar elemen.
    const writes: Array<[HTMLElement, string]> = []
    for (const el of visible) {
      const r = el.getBoundingClientRect()
      const denom = vh + r.height
      if (denom <= 0) continue
      writes.push([el, clamp((vh - r.top) / denom, 0, 1).toFixed(3)])
    }
    for (const [el, v] of writes) el.style.setProperty('--zy-progress', v)
  }
  function scheduleProgress(): void {
    if (scrollRaf) return
    scrollRaf = win.requestAnimationFrame(updateProgress)
  }
  function onScroll(): void {
    scheduleProgress()
  }

  // ----- tilt -----
  function bindTilt(el: HTMLElement): void {
    const move = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect()
      if (r.width <= 0 || r.height <= 0) return
      const px = clamp((ev.clientX - r.left) / r.width - 0.5, -0.5, 0.5)
      const py = clamp((ev.clientY - r.top) / r.height - 0.5, -0.5, 0.5)
      el.style.setProperty('--zy-tilt-y', (px * 2 * TILT_MAX).toFixed(2))
      el.style.setProperty('--zy-tilt-x', (-py * 2 * TILT_MAX).toFixed(2))
    }
    const leave = () => {
      el.style.setProperty('--zy-tilt-x', '0')
      el.style.setProperty('--zy-tilt-y', '0')
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    tilts.set(el, { move, leave })
  }

  // ----- marquee -----
  // Klon hanya dekorasi: tak boleh bisa difokus, tak boleh menggandakan id/name.
  function sanitizeClone(clone: HTMLElement): void {
    clone.setAttribute('inert', '')
    const all = [clone, ...clone.querySelectorAll<HTMLElement>('*')]
    for (const n of all) {
      n.removeAttribute('id')
      n.removeAttribute('name')
      // `inert` belum ada di browser lama: cadangkan dengan tabindex -1 pada yang bisa difokus.
      if (n.matches('a,button,input,select,textarea,summary,[tabindex]'))
        n.setAttribute('tabindex', '-1')
    }
  }
  function cloneMarquee(track: HTMLElement): void {
    if (track.hasAttribute('data-zy-cloned')) return
    track.setAttribute('data-zy-cloned', '')
    for (const child of [...track.children]) {
      const clone = child.cloneNode(true) as HTMLElement
      clone.setAttribute('aria-hidden', 'true')
      clone.setAttribute('data-zy-clone', '')
      sanitizeClone(clone)
      track.appendChild(clone)
    }
    clonedTracks.add(track)
  }

  // ----- scan -----
  function scan(): void {
    // stagger
    for (const group of contentRoot.querySelectorAll<HTMLElement>('.zy-stagger')) {
      ;[...group.children].forEach((child, i) => {
        ;(child as HTMLElement).style?.setProperty('--zy-stagger-i', String(i))
      })
    }

    // marquee
    for (const track of contentRoot.querySelectorAll<HTMLElement>('.zy-marquee__track'))
      cloneMarquee(track)

    // reveal + counter
    const targets: Element[] = []
    for (const el of contentRoot.querySelectorAll('[class*="zy-anim-"], .zy-count')) {
      if (watched.has(el)) continue
      const anim = isAnim(el)
      const count = el.classList.contains('zy-count')
      if (!anim && !count) continue
      if (anim && el.classList.contains('is-in') && !count) continue
      targets.push(el)
    }
    if (targets.length) {
      if (!ioAvailable()) {
        // Lingkungan lama / SSR: jangan pernah menyembunyikan konten.
        for (const el of targets) {
          watched.add(el)
          el.classList.add('is-in')
        }
      } else {
        reveal ??= new win.IntersectionObserver(onReveal, { ...REVEAL_OPTIONS })
        for (const el of targets) {
          watched.add(el)
          reveal.observe(el)
        }
      }
    }

    if (!e.rich) return

    // scroll-driven
    const fresh: HTMLElement[] = []
    for (const el of contentRoot.querySelectorAll<HTMLElement>(
      '[class*="zy-parallax-"], .zy-scale-in-scroll',
    )) {
      if (!isScrollDriven(el) || scrollEls.has(el)) continue
      scrollEls.add(el)
      fresh.push(el)
    }
    if (fresh.length) {
      if (ioAvailable()) {
        visibility ??= new win.IntersectionObserver(
          (entries) => {
            for (const en of entries) {
              const t = en.target as HTMLElement
              if (en.isIntersecting) visible.add(t)
              else visible.delete(t)
            }
            scheduleProgress()
          },
          { threshold: 0 },
        )
        for (const el of fresh) visibility.observe(el)
      } else {
        for (const el of fresh) visible.add(el)
      }
      if (!scrollBound) {
        win.addEventListener('scroll', onScroll, { passive: true })
        scrollBound = true
      }
      scheduleProgress()
    }

    // tilt
    for (const el of contentRoot.querySelectorAll<HTMLElement>('.zy-tilt')) {
      if (!tilts.has(el)) bindTilt(el)
    }
  }

  function start(): void {
    if (started || e.reducedMotion) return
    started = true
    contentRoot.classList.add('zy-js')
    scan()
  }

  function refresh(): void {
    if (!started) return
    scan()
  }

  function stop(): void {
    if (!started) return
    started = false
    reveal?.disconnect()
    visibility?.disconnect()
    reveal = null
    visibility = null
    if (scrollBound) {
      win.removeEventListener('scroll', onScroll)
      scrollBound = false
    }
    if (scrollRaf) {
      win.cancelAnimationFrame(scrollRaf)
      scrollRaf = 0
    }
    cancelCounters()
    for (const [el, h] of tilts) {
      el.removeEventListener('pointermove', h.move)
      el.removeEventListener('pointerleave', h.leave)
    }
    tilts.clear()
    watched = new WeakSet<Element>() // start() berikutnya harus mengamati ulang
    scrollEls.clear()
    visible.clear()
    // Klon marquee tidak boleh bocor ke DOM (mis. ikut ter-export dari editor).
    for (const track of clonedTracks) {
      track.querySelectorAll(':scope > [data-zy-clone]').forEach((n) => n.remove())
      track.removeAttribute('data-zy-cloned')
    }
    clonedTracks.clear()
    contentRoot.classList.remove('zy-js')
  }

  function replay(): void {
    if (!started) return
    reveal?.disconnect()
    reveal = null
    cancelCounters()
    for (const el of contentRoot.querySelectorAll('[class*="zy-anim-"], .zy-count')) {
      if (isAnim(el) || el.classList.contains('zy-count')) {
        el.classList.remove('is-in')
        watched.delete(el)
      }
    }
    // Hero: animasi sekali jalan; lepas kelas, paksa reflow, pasang lagi.
    for (const hero of contentRoot.querySelectorAll<HTMLElement>(`.${HERO}`)) {
      hero.classList.remove(HERO)
      void hero.offsetWidth
      hero.classList.add(HERO)
    }
    scan()
  }

  return { start, stop, replay, refresh }
}
