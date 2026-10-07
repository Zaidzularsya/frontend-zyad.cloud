import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

// Dibaca lewat fs, bukan `?raw`: vitest mengosongkan CSS yang tidak ada di `css.include`
// (vitest.config.ts), termasuk untuk `?raw`, sehingga import `?raw` menghasilkan string kosong.
const rawCss = readFileSync(
  resolve(process.cwd(), 'src/features/landing/renderer/motion/zy-motion.css'),
  'utf8',
)

// Prettier memformat ulang CSS saat commit; tes tidak boleh sensitif whitespace.
const noComments = rawCss.replace(/\/\*[\s\S]*?\*\//g, '')
const css = noComments.replace(/\s+/g, ' ').replace(/ ?([{};:,]) ?/g, '$1')

// Versi tanpa whitespace sama sekali untuk pencocokan nilai (calc, shorthand).
const flat = noComments.replace(/\s+/g, '')

function blocks(re: RegExp): string[] {
  return [...css.matchAll(re)].map((m) => m[0])
}

describe('zy-motion.css', () => {
  it('imports as real text', () => {
    expect(typeof rawCss).toBe('string')
    expect(rawCss.length).toBeGreaterThan(500)
  })

  it('hides entrance elements only under .zy-js and :not(.is-in)', () => {
    expect(css).toMatch(/\.zy-js \.zy-anim-fade-up:not\(\.is-in\)/)
    // Tanpa .zy-js tidak boleh ada aturan yang menyembunyikan konten.
    const rules = [...css.matchAll(/(?:^|\})([^{}@]+)\{([^{}]*)\}/g)]
    for (const [, sel = '', body = ''] of rules) {
      if (/^(from|to|\d+%.*)$/.test(sel)) continue // isi @keyframes
      if (/::(before|after)/.test(sel)) continue // overlay dekoratif, bukan konten
      if (/opacity:0(?![.\d])/.test(body) && !/prefers/.test(sel)) {
        expect(sel).toContain('.zy-js')
        expect(sel).toContain(':not(.is-in)')
      }
    }
  })

  it('disables motion for reduced-motion users and forces the final state', () => {
    const m = flat.match(/@media\(prefers-reduced-motion:reduce\)\{.*$/)
    expect(m).not.toBeNull()
    const block = m![0]!
    expect(block).toContain('.zy-js')
    expect(block).toContain('animation:none!important')
    expect(block).toContain('transition:none!important')
    expect(block).toContain('opacity:1!important')
    expect(block).toContain('transform:none!important')
    expect(block).toContain('clip-path:none!important')
    expect(block).toContain('filter:none!important')
  })

  it('animates only compositor-friendly properties', () => {
    const layout = /\b(width|height|top|left|right|bottom|margin|padding|inset)\b/
    for (const t of css.match(/transition(-property)?:[^;}]+/g) ?? []) expect(t).not.toMatch(layout)
    for (const kf of blocks(/@keyframes [\w-]+\{(?:[^{}]*\{[^{}]*\})+\}/g)) {
      expect(kf).not.toMatch(layout)
    }
  })

  it('never uses transition: all', () => {
    expect(css).not.toMatch(/transition:all/)
  })

  it('defines every keyframes that is referenced', () => {
    const defined = new Set([...css.matchAll(/@keyframes ([\w-]+)/g)].map((m) => m[1]))
    const used = [...css.matchAll(/animation(?:-name)?:([^;}]+)/g)]
      .flatMap((m) => (m[1] ?? '').split(/[\s,]+/))
      .filter((t) => /^zy-[\w-]+$/.test(t))
    expect(used.length).toBeGreaterThan(0)
    for (const name of used) expect(defined.has(name), name).toBe(true)
  })

  it('uses the exact constants from the spec', () => {
    expect(flat).toContain('700ms')
    expect(flat).toMatch(/\.zy-dur-fast\{--zy-dur:400ms/)
    expect(flat).toMatch(/\.zy-dur-slow\{--zy-dur:1200ms/)
    for (let i = 1; i <= 8; i++) expect(flat).toContain(`.zy-delay-${i}00{--zy-delay:${i}00ms`)
    expect(flat).toContain('var(--zy-stagger-i,0)*80ms')
    expect(flat).toContain('translate3d(0,32px,0)')
    expect(flat).toMatch(/@media\(max-width:767px\)/)
    expect(flat).toContain('translate3d(0,16px,0)')
    expect(flat).toMatch(/\.zy-parallax-slow[^{]*\{[^}]*\*0?\.1\*200px/)
    expect(flat).toMatch(/\.zy-parallax-med[^{]*\{[^}]*\*0?\.2\*200px/)
    expect(flat).toMatch(/\.zy-parallax-fast[^{]*\{[^}]*\*0?\.35\*200px/)
    expect(flat).toContain('translate3d(0,-4px,0)')
    expect(flat).toMatch(/\.zy-hover-lift[^{]*\{[^}]*150ms/)
    expect(flat).toMatch(/scale\(calc\(0?\.94\+0?\.06\*var\(--zy-progress/)
    expect(flat).toMatch(/animation:zy-marquee40slinearinfinite/)
    expect(flat).toMatch(/\.zy-marquee:hover[^{]*\{[^}]*animation-play-state:paused/)
    expect(flat).toMatch(/animation:zy-flow-cycle8sinfinite/)
    for (const [n, d] of [
      [1, 0],
      [2, 2],
      [3, 4],
      [4, 6],
    ]) {
      expect(flat).toMatch(
        new RegExp(`\\.zy-flow__step:nth-child\\(${n}\\)\\{[^}]*animation-delay:${d}s`),
      )
    }
    expect(flat).toContain('rotateX(calc(var(--zy-tilt-x,0)*1deg))')
    expect(flat).toContain('rotateY(calc(var(--zy-tilt-y,0)*1deg))')
  })

  it.each([
    'zy-anim-fade-up',
    'zy-anim-fade-in',
    'zy-anim-zoom-in',
    'zy-anim-slide-left',
    'zy-anim-slide-right',
    'zy-anim-blur-in',
    'zy-anim-clip-reveal',
    'zy-anim-hero',
    'zy-delay-100',
    'zy-delay-800',
    'zy-dur-fast',
    'zy-dur-slow',
    'zy-stagger',
    'zy-parallax-slow',
    'zy-parallax-med',
    'zy-parallax-fast',
    'zy-scale-in-scroll',
    'zy-tilt',
    'zy-hover-lift',
    'zy-hover-glow',
    'zy-aurora',
    'zy-float',
    'zy-text-shimmer',
    'zy-count',
    'zy-marquee',
    'zy-marquee__track',
    'zy-flow',
    'zy-flow__step',
  ])('defines .%s', (cls) => {
    expect(css).toContain(`.${cls}`)
  })

  it('does not depend on :root or body (shadow root safe)', () => {
    expect(css).not.toMatch(/:root|(^|[\s,{}])body[\s,{]/)
  })
})
