import { describe, expect, it } from 'vitest'

import { useLandingPageContext } from './page-context'

describe('useLandingPageContext', () => {
  it('falls back safely outside a provider', () => {
    const ctx = useLandingPageContext()
    expect(ctx.orgType.value).toBe('')
    expect(ctx.interest.value).toBe('')
    expect(() => ctx.scrollToId('x')).not.toThrow()
  })
})
