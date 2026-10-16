import { describe, expect, it } from 'vitest'

import { contrastRatio, pickOnColor } from './contrast'

describe('contrast', () => {
  it('contrastRatio white/black = 21, same color = 1', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5)
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#336699', '#336699')).toBeCloseTo(1, 5)
  })

  it('flags yellow text on white as low contrast (< 4.5)', () => {
    expect(contrastRatio('#ffff00', '#ffffff')).toBeLessThan(4.5)
  })

  it('pickOnColor returns dark text on light accents and white on dark', () => {
    expect(pickOnColor('#EF9F27')).toBe('#111111')
    expect(pickOnColor('#ffff00')).toBe('#111111')
    expect(pickOnColor('#0b1f3a')).toBe('#ffffff')
    expect(pickOnColor('#1F6F5C')).toBe('#ffffff')
  })
})
