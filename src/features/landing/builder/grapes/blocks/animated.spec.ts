import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import DOMPurify from 'dompurify'
import { describe, expect, it } from 'vitest'
import { GRAPES_BLOCKS } from '../grapes.blocks'
import { ANIMATED_BLOCKS } from './animated'

const css = readFileSync(resolve(__dirname, '../../../renderer/motion/zy-motion.css'), 'utf8')
const html = (id: string) => String(ANIMATED_BLOCKS.find((b) => b.id === id)!.content)

describe('ANIMATED_BLOCKS', () => {
  it('exports the six animated blocks in category Animasi', () => {
    expect(ANIMATED_BLOCKS.map((b) => b.id)).toEqual([
      'zy-anim-hero-aurora',
      'zy-anim-marquee',
      'zy-anim-stats',
      'zy-anim-bento',
      'zy-anim-steps',
      'zy-anim-product-flow',
    ])
    expect(new Set(ANIMATED_BLOCKS.map((b) => b.category))).toEqual(new Set(['Animasi']))
  })

  it('product flow has four steps in order', () => {
    const h = html('zy-anim-product-flow')
    expect([...h.matchAll(/zy-flow__step[^>]*>[\s\S]*?<\/[^>]+>/g)].length).toBeGreaterThanOrEqual(
      4,
    )
    const idx = ['Lead masuk', 'Deal dibuat', 'Penawaran disetujui', 'Invoice lunas'].map((t) => {
      expect(h).toContain(t)
      return h.indexOf(t)
    })
    expect([...idx].sort((a, b) => a - b)).toEqual(idx)
    expect(h.match(/class="zy-flow__step"/g)).toHaveLength(4)
  })

  it('blocks contain no script, inline handler, style tag, or indigo', () => {
    for (const b of ANIMATED_BLOCKS) {
      expect(String(b.content)).not.toMatch(/<script|<style|\son\w+=|#465fff|indigo/i)
    }
  })

  it('every zy-* class used exists in zy-motion.css', () => {
    for (const b of ANIMATED_BLOCKS) {
      const used = new Set<string>()
      for (const m of String(b.content).matchAll(/class="([^"]*)"/g)) {
        ;(m[1] ?? '')
          .split(/\s+/)
          .filter((c) => c.startsWith('zy-'))
          .forEach((c) => used.add(c))
      }
      expect(used.size, b.id).toBeGreaterThan(0)
      for (const c of used) expect(css, `${b.id} -> ${c}`).toContain(`.${c}`)
    }
  })

  it('has no invented numbers in visible text (only [0] placeholder)', () => {
    for (const b of ANIMATED_BLOCKS) {
      const text = String(b.content)
        .replace(/<[^>]*>/g, ' ')
        .replace(/\[0\]/g, '')
      expect(text, b.id).not.toMatch(/\d/)
    }
  })

  it('ids are unique across the whole catalog', () => {
    const ids = GRAPES_BLOCKS.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const b of ANIMATED_BLOCKS) expect(GRAPES_BLOCKS).toContain(b)
  })

  it('uses zy-aurora exactly once, and zy-anim-hero on the hero h1', () => {
    const all = ANIMATED_BLOCKS.map((b) => String(b.content)).join('\n')
    expect(all.match(/\bzy-aurora\b/g)).toHaveLength(1)
    expect(html('zy-anim-hero-aurora')).toMatch(/<h1[^>]*class="[^"]*zy-anim-hero/)
  })

  it('uses counters with placeholder text and a single marquee track without duplicates', () => {
    expect(html('zy-anim-stats')).toMatch(/class="zy-count"[^>]*>\[0\]</)
    expect(html('zy-anim-marquee').match(/\[Logo\]/g)).toHaveLength(6)
  })

  it('survives the renderer DOMPurify config with classes and inline styles intact', () => {
    for (const b of ANIMATED_BLOCKS) {
      const src = String(b.content)
      const out = DOMPurify.sanitize(src, {
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'base', 'meta', 'link'],
        FORBID_ATTR: ['srcdoc'],
        ADD_ATTR: ['target'],
        ALLOW_DATA_ATTR: true,
      })
      const classes = (h: string) => [...h.matchAll(/class="([^"]*)"/g)].map((m) => m[1])
      expect(classes(out), b.id).toEqual(classes(src))
      expect(out).toContain('style="')
      expect((out.match(/style="/g) ?? []).length).toBe((src.match(/style="/g) ?? []).length)
    }
  })
})
