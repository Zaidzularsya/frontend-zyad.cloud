import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  ANIMATION_GROUPS,
  applyGroupChoice,
  readGroupChoice,
  type AnimationGroup,
} from './animation-classes'

// Via fs, bukan `?raw` (vitest mengosongkan CSS non-include).
const css = readFileSync(
  resolve(process.cwd(), 'src/features/landing/renderer/motion/zy-motion.css'),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '')

describe('applyGroupChoice / readGroupChoice', () => {
  it('replaces the previous class in the same group', () => {
    expect(applyGroupChoice(['hero', 'zy-anim-fade-up'], 'entrance', 'zy-anim-zoom-in')).toEqual({
      add: ['zy-anim-zoom-in'],
      remove: ['zy-anim-fade-up'],
    })
  })
  it('clears the group with empty value', () => {
    expect(applyGroupChoice(['zy-delay-300'], 'delay', '')).toEqual({
      add: [],
      remove: ['zy-delay-300'],
    })
  })
  it('reads the current choice', () => {
    expect(readGroupChoice(['x', 'zy-parallax-med'], 'parallax')).toBe('zy-parallax-med')
    expect(readGroupChoice(['x'], 'parallax')).toBe('')
  })
  it('never touches non-zy classes', () => {
    expect(applyGroupChoice(['zy-hover-lift', 'card'], 'hover', 'zy-hover-glow').remove).toEqual([
      'zy-hover-lift',
    ])
  })
  it('does not remove hero/ambient classes', () => {
    const ambient = [
      'zy-anim-hero',
      'zy-aurora',
      'zy-float',
      'zy-text-shimmer',
      'zy-count',
      'zy-marquee',
      'zy-flow',
    ]
    for (const group of Object.keys(ANIMATION_GROUPS) as AnimationGroup[]) {
      expect(applyGroupChoice(ambient, group, '').remove).toEqual([])
      expect(
        applyGroupChoice(ambient, group, ANIMATION_GROUPS[group].options[1]!.value).remove,
      ).toEqual([])
    }
  })
  it('does not stack when re-applying the same choice repeatedly', () => {
    let classes = ['card']
    for (const v of [
      'zy-anim-fade-up',
      'zy-anim-zoom-in',
      'zy-anim-fade-up',
      'zy-anim-blur-in',
      'zy-anim-blur-in',
    ]) {
      const { add, remove } = applyGroupChoice(classes, 'entrance', v)
      classes = [...classes.filter((c) => !remove.includes(c)), ...add]
    }
    expect(classes).toEqual(['card', 'zy-anim-blur-in'])
  })
  it('toggles stagger and tilt on/off', () => {
    expect(applyGroupChoice([], 'stagger', 'zy-stagger')).toEqual({
      add: ['zy-stagger'],
      remove: [],
    })
    expect(applyGroupChoice(['zy-stagger'], 'stagger', '')).toEqual({
      add: [],
      remove: ['zy-stagger'],
    })
    expect(applyGroupChoice([], 'tilt', 'zy-tilt')).toEqual({ add: ['zy-tilt'], remove: [] })
    expect(applyGroupChoice(['zy-tilt'], 'tilt', '')).toEqual({ add: [], remove: ['zy-tilt'] })
  })
})

describe('ANIMATION_GROUPS vs zy-motion.css', () => {
  const values = Object.values(ANIMATION_GROUPS).flatMap((g) =>
    g.options.map((o) => o.value).filter(Boolean),
  )
  it('has options', () => expect(values.length).toBeGreaterThan(20))
  it.each(values)('class %s is defined in zy-motion.css', (cls) => {
    expect(css).toMatch(new RegExp(`\\.${cls}(?![\\w-])`))
  })
})
