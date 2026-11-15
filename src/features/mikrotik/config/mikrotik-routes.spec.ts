import { describe, expect, it } from 'vitest'

import { createMemoryHistory, createRouter } from 'vue-router'

import { buildMikrotikRoutes } from '@/features/mikrotik/config/mikrotik-routes'

// Rute dipasang sebagai child (path relatif); untuk resolve langsung beri awalan '/'.
const withLeadingSlash = () => buildMikrotikRoutes('/mikrotik', 'mikrotik')

describe('buildMikrotikRoutes', () => {
  const routes = buildMikrotikRoutes('mikrotik')

  it('menyediakan rute dengan nama dan path yang diharapkan', () => {
    expect(routes.map((r) => [r.name, r.path])).toEqual([
      ['mikrotik', 'mikrotik'],
      ['mikrotik-routers', 'mikrotik/routers'],
      ['mikrotik-accounts', 'mikrotik/accounts'],
      ['mikrotik-secret-detail', 'mikrotik/secrets/:id'],
      ['mikrotik-isolation', 'mikrotik/isolation'],
      ['mikrotik-tasks', 'mikrotik/tasks'],
      ['mikrotik-control', 'mikrotik/control'],
      ['mikrotik-launch', 'mikrotik/launch'],
    ])
  })

  it('memakai permission yang tepat per rute', () => {
    const perms = Object.fromEntries(routes.map((r) => [r.name, r.meta?.permissions]))
    expect(perms).toEqual({
      mikrotik: ['mikrotik_router.read'],
      'mikrotik-routers': ['mikrotik_router.read'],
      'mikrotik-accounts': ['mikrotik_secret.read'],
      'mikrotik-secret-detail': ['mikrotik_secret.read'],
      'mikrotik-isolation': ['mikrotik_task.read'],
      'mikrotik-tasks': undefined,
      'mikrotik-control': undefined,
      'mikrotik-launch': undefined,
    })
  })

  it('semua komponen lazy (fungsi); rute lama hanya redirect', () => {
    for (const r of routes) {
      if (['mikrotik-tasks', 'mikrotik-control', 'mikrotik-launch'].includes(r.name as string))
        expect(r.redirect).toBeDefined()
      else expect(typeof r.component).toBe('function')
    }
  })

  // router.resolve tidak menjalankan redirect, jadi diuji lewat navigasi.
  async function land(to: string | { name: string }) {
    const router = createRouter({ history: createMemoryHistory(), routes: withLeadingSlash() })
    await router.push(to)
    return router.currentRoute.value
  }

  it('rute lama diarahkan ke Isolir dengan tab yang setara', async () => {
    const tasks = await land('/mikrotik/tasks?status=failed')
    expect(tasks.name).toBe('mikrotik-isolation')
    expect(tasks.query).toEqual({ status: 'failed', tab: 'tasks' })
    const control = await land('/mikrotik/control')
    expect(control.name).toBe('mikrotik-isolation')
    expect(control.query).toEqual({ tab: 'control' })
    const launch = await land('/mikrotik/launch')
    expect(launch.name).toBe('mikrotik-isolation')
    expect(launch.query).toEqual({})
  })

  it('nama rute lama tetap bisa dipakai RouterLink', async () => {
    expect((await land({ name: 'mikrotik-tasks' })).name).toBe('mikrotik-isolation')
    expect((await land({ name: 'mikrotik-control' })).query).toEqual({ tab: 'control' })
    expect((await land({ name: 'mikrotik-launch' })).name).toBe('mikrotik-isolation')
  })

  it('namePrefix memisahkan nama dari path', () => {
    const named = buildMikrotikRoutes('x', 'platform-x')
    expect(named.map((r) => r.name)).toContain('platform-x-routers')
    expect(named[0]?.path).toBe('x')
  })
})
