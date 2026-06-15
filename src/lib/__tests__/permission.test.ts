import { describe, expect, it } from 'vitest'

import { hasPermission } from '@/lib/permission'

describe('hasPermission', () => {
  const permissions = ['user.read', 'user.create', 'audit.read'] as const

  it('accepts one granted permission', () => {
    expect(hasPermission([...permissions], 'user.read')).toBe(true)
  })

  it('requires every permission when passed an array', () => {
    expect(hasPermission([...permissions], ['user.read', 'user.create'])).toBe(true)
    expect(hasPermission([...permissions], ['user.read', 'organization.user.manage'])).toBe(false)
  })
})
