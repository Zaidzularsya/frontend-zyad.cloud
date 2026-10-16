import { describe, expect, it } from 'vitest'

import { useLandingPageContext } from './page-context'

describe('useLandingPageContext', () => {
  it('falls back safely outside a provider', () => {
    const ctx = useLandingPageContext()
    expect(ctx.orgType.value).toBe('')
    expect(ctx.interest.value).toBe('')
    expect(() => ctx.scrollToId('x')).not.toThrow()
  })

  it('openLeadPopup returns false when nothing is registered', () => {
    const ctx = useLandingPageContext()
    expect(ctx.openLeadPopup()).toBe(false)
    expect(ctx.overlayTarget.value).toBeNull()
    expect(() => ctx.registerLeadPopup(() => {})()).not.toThrow()
  })
})
