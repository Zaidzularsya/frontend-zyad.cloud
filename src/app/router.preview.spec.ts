import { describe, expect, it } from 'vitest'

import { router } from '@/app/router'

describe('router /preview/:token', () => {
  it('publik dan tidak tertelan rute /:slug', () => {
    const resolved = router.resolve('/preview/abc123')
    expect(resolved.name).toBe('landing-activation-preview')
    expect(resolved.params.token).toBe('abc123')
    expect(resolved.meta.public).toBe(true)
    expect(resolved.meta.requiresAuth).toBeFalsy()
    expect(resolved.matched.some((r) => r.meta.requiresAuth || r.meta.requiresTenant)).toBe(false)
  })
})
