import { describe, expect, it } from 'vitest'

import { blockById } from '@/features/landing/shared/blocks/catalog'
import { SOCIAL_ICONS, SOCIAL_PLATFORMS, safeSocialHref } from './socialIcons'

describe('socialIcons', () => {
  it('every icon has a label, brand colour and a single path', () => {
    for (const platform of SOCIAL_PLATFORMS) {
      const icon = SOCIAL_ICONS[platform]
      expect(icon.label, platform).toBeTruthy()
      expect(icon.brandColor, platform).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(icon.path.length, platform).toBeGreaterThan(20)
    }
  })

  it('the Social buttons block only offers platforms that have an icon', () => {
    const block = blockById('element.socialButtons')
    const platformField = block?.schema
      .find((f) => f.key === 'items')
      ?.itemSchema?.find((f) => f.key === 'platform')
    expect(platformField?.options?.length).toBeGreaterThan(0)
    for (const option of platformField!.options!) {
      expect(SOCIAL_PLATFORMS, option).toContain(option)
    }
  })

  it('safeSocialHref keeps http(s) and mailto, drops everything else', () => {
    expect(safeSocialHref('https://x.test/a')).toBe('https://x.test/a')
    expect(safeSocialHref('http://x.test')).toBe('http://x.test')
    expect(safeSocialHref('mailto:hi@x.test')).toBe('mailto:hi@x.test')
    expect(safeSocialHref('javascript:alert(1)')).toBe('#')
    expect(safeSocialHref('/relative')).toBe('#')
    expect(safeSocialHref('')).toBe('#')
    expect(safeSocialHref(undefined)).toBe('#')
  })
})
