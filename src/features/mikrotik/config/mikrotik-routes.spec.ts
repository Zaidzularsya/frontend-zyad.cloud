import { describe, expect, it } from 'vitest'

import { buildMikrotikRoutes } from '@/features/mikrotik/config/mikrotik-routes'

describe('buildMikrotikRoutes', () => {
  const routes = buildMikrotikRoutes('mikrotik')

  it('menyediakan empat rute dengan nama dan path yang diharapkan', () => {
    expect(routes.map((r) => [r.name, r.path])).toEqual([
      ['mikrotik', 'mikrotik'],
      ['mikrotik-routers', 'mikrotik/routers'],
      ['mikrotik-accounts', 'mikrotik/accounts'],
      ['mikrotik-tasks', 'mikrotik/tasks'],
    ])
  })

  it('memakai permission yang tepat per rute', () => {
    const perms = Object.fromEntries(routes.map((r) => [r.name, r.meta?.permissions]))
    expect(perms).toEqual({
      mikrotik: ['mikrotik_router.read'],
      'mikrotik-routers': ['mikrotik_router.read'],
      'mikrotik-accounts': ['mikrotik_secret.read'],
      'mikrotik-tasks': ['mikrotik_task.read'],
    })
  })

  it('semua komponen lazy (fungsi)', () => {
    for (const r of routes) expect(typeof r.component).toBe('function')
  })

  it('namePrefix memisahkan nama dari path', () => {
    const named = buildMikrotikRoutes('x', 'platform-x')
    expect(named.map((r) => r.name)).toContain('platform-x-routers')
    expect(named[0]?.path).toBe('x')
  })
})
