import { describe, expect, it } from 'vitest'

import { hasPermission } from '@/lib/permission'

describe('hasPermission', () => {
  const permissions = ['users.read', 'users.create', 'settings.read'] as const

  it('accepts one granted permission', () => {
    expect(hasPermission([...permissions], 'users.read')).toBe(true)
  })

  it('requires every permission when passed an array', () => {
    expect(hasPermission([...permissions], ['users.read', 'users.create'])).toBe(true)
    expect(hasPermission([...permissions], ['users.read', 'billing.manage'])).toBe(false)
  })
})
