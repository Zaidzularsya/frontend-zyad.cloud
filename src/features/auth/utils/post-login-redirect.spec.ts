import { describe, expect, it } from 'vitest'
import { resolvePostLoginRedirect } from './post-login-redirect'

function authWithRoles(roles: string[]) {
  return { user: { roles } } as unknown as Parameters<typeof resolvePostLoginRedirect>[0]
}

describe('resolvePostLoginRedirect', () => {
  it('defaults super_admin to /platform/dashboard when there is no redirect query', () => {
    expect(resolvePostLoginRedirect(authWithRoles(['super_admin']), undefined)).toBe(
      '/platform/dashboard',
    )
  })

  it('defaults a regular user to /app/dashboard when there is no redirect query', () => {
    expect(resolvePostLoginRedirect(authWithRoles(['member']), undefined)).toBe('/app/dashboard')
  })

  it('ignores a stray /app redirect for super_admin and falls back to /platform/dashboard', () => {
    expect(resolvePostLoginRedirect(authWithRoles(['super_admin']), '/app/dashboard')).toBe(
      '/platform/dashboard',
    )
  })

  it('still honors a /platform redirect for super_admin', () => {
    expect(
      resolvePostLoginRedirect(authWithRoles(['super_admin']), '/platform/billing-plans'),
    ).toBe('/platform/billing-plans')
  })

  it('honors any redirect for a regular user', () => {
    expect(resolvePostLoginRedirect(authWithRoles(['member']), '/app/billing')).toBe('/app/billing')
  })
})
