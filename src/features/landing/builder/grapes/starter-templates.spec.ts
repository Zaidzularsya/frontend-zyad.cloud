import { describe, expect, it } from 'vitest'

import { GRAPES_STARTERS } from './starter-templates'

describe('GRAPES_STARTERS', () => {
  it('exposes a non-empty catalogue with unique ids', () => {
    expect(GRAPES_STARTERS.length).toBeGreaterThan(1)
    const ids = GRAPES_STARTERS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every starter has a label, description, html and css', () => {
    for (const starter of GRAPES_STARTERS) {
      expect(starter.label.trim()).not.toBe('')
      expect(starter.description.trim()).not.toBe('')
      expect(starter.html.trim()).not.toBe('')
      expect(starter.css.trim()).not.toBe('')
    }
  })

  it('carries no executable markup (script tags / inline handlers / javascript: urls)', () => {
    for (const starter of GRAPES_STARTERS) {
      expect(starter.html).not.toMatch(/<script/i)
      expect(starter.html).not.toMatch(/\son\w+=/i)
      expect(starter.html).not.toMatch(/javascript:/i)
      expect(starter.css).not.toMatch(/@import/i)
    }
  })

  it('registers Zyad Marketing as the only platform-only starter', () => {
    const platformOnly = GRAPES_STARTERS.filter((s) => s.platformOnly)
    expect(platformOnly.map((s) => s.id)).toEqual(['zyad-marketing'])
  })
})
