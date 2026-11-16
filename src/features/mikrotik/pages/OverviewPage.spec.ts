import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, RouterLink } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'
import type { Permission } from '@/types/auth'
import OverviewPage from '@/features/mikrotik/pages/OverviewPage.vue'
import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import { controlState, onboarding, routerFixture } from '@/features/mikrotik/testing/fixtures'
import type { Router, RouterSummary } from '@/features/mikrotik/types'

vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: {
    onboarding: { get: vi.fn() },
    control: {
      get: vi.fn(),
      previewSummary: vi.fn().mockResolvedValue({}),
      preview: vi.fn().mockResolvedValue({ data: [], meta: {} }),
      activity: vi.fn().mockResolvedValue({ data: [], meta: {} }),
    },
    policy: { set: vi.fn() },
    tasks: { summary: vi.fn(), list: vi.fn() },
    routers: { list: vi.fn(), summary: vi.fn(), stats: vi.fn(), check: vi.fn() },
    setup: { allowlistHealth: vi.fn().mockResolvedValue({ unresolved: 0 }) },
  },
}))

const summary: RouterSummary = {
  secrets: {
    total: 180,
    paired: 150,
    unpaired: 30,
    missing: 2,
    need_original_profile: 4,
    isolated: 7,
  },
  tasks: { pending: 3, running: 0, done: 10, failed: 1, cancelled: 0 },
}

const core1 = routerFixture({ id: 'r1', name: 'Core-1', host: '10.0.0.1', last_check_status: 'ok' })
const core2 = routerFixture({
  id: 'r2',
  name: 'Edge-2',
  host: '10.0.0.2',
  last_check_status: 'unreachable',
})

function useRouters(list: Router[]) {
  vi.mocked(mikrotikApi.routers.list).mockResolvedValue({
    data: list,
    meta: { page: 1, per_page: 200, total: list.length, total_pages: 1 },
  } as never)
}

async function mountPage(
  permissions: Permission[] = ['mikrotik_control.read'],
  path = '/mikrotik',
) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().$patch((st) => {
    ;(st as { user: unknown }).user = { id: 'u', name: 'A', email: 'a@x.test', permissions }
  })
  const names = [
    'mikrotik',
    'mikrotik-routers',
    'mikrotik-accounts',
    'mikrotik-isolation',
    'crm-products',
    'billing-receivable-settings',
  ]
  const router = createRouter({
    history: createMemoryHistory(),
    routes: names.map((name) => ({ path: `/${name}`, name, component: { template: '<i/>' } })),
  })
  await router.push(path)
  const w = mount(OverviewPage, {
    global: {
      plugins: [
        pinia,
        router,
        [
          VueQueryPlugin,
          { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        ],
      ],
    },
  })
  await flushPromises()
  await flushPromises()
  return { w, router }
}

describe('OverviewPage', () => {
  beforeEach(() => {
    vi.mocked(mikrotikApi.onboarding.get)
      .mockReset()
      .mockResolvedValue(onboarding({ complete: true }))
    vi.mocked(mikrotikApi.control.get)
      .mockReset()
      .mockResolvedValue(controlState({ mode: 'active' }))
    vi.mocked(mikrotikApi.routers.summary).mockReset().mockResolvedValue(summary)
    vi.mocked(mikrotikApi.routers.stats)
      .mockReset()
      .mockReturnValue(new Promise(() => {}))
    vi.mocked(mikrotikApi.tasks.summary)
      .mockReset()
      .mockResolvedValue({ counts: {}, oldest_pending_restore_at: null })
    vi.mocked(mikrotikApi.tasks.list)
      .mockReset()
      .mockResolvedValue({
        data: [],
        meta: { page: 1, per_page: 5, total: 0, total_pages: 1 },
      } as never)
    useRouters([core1, core2])
  })

  it('shows the checklist while onboarding is incomplete', async () => {
    vi.mocked(mikrotikApi.onboarding.get).mockResolvedValue(onboarding())
    const { w } = await mountPage()
    expect(w.findAll('[data-step]')).toHaveLength(5)
  })

  it('summarizes router health and offers a picker for several routers', async () => {
    const { w } = await mountPage()
    expect(w.text()).toContain('2 router terpasang · 1 online · 1 bermasalah')
    const select = w.get('select')
    expect(select.attributes('id')).toBeTruthy()
    expect(w.get(`label[for="${select.attributes('id')}"]`).text()).toBe('Router')
  })

  it('hides the picker for a single router and shows its name as the title', async () => {
    useRouters([core1])
    const { w } = await mountPage()
    expect(w.find('select').exists()).toBe(false)
    expect(w.get('h2').text()).toBe('Core-1')
  })

  it('falls back to the first router for an unknown ?router id', async () => {
    const { w } = await mountPage(['mikrotik_control.read'], '/mikrotik?router=hilang')
    expect(mikrotikApi.routers.summary).toHaveBeenCalledWith('r1')
    expect(w.text()).toContain('10.0.0.1:8728')
    expect((w.get('select').element as HTMLSelectElement).value).toBe('r1')
  })

  it('uses the router from the query string and syncs the picker to it', async () => {
    const { w, router } = await mountPage(['mikrotik_control.read'], '/mikrotik?router=r2')
    expect(w.text()).toContain('10.0.0.2:8728')
    await w.get('select').setValue('r1')
    await flushPromises()
    expect(router.currentRoute.value.query.router).toBe('r1')
    expect(w.text()).toContain('10.0.0.1:8728')
  })

  it('shows the secret card from the summary while stats are still pending', async () => {
    const { w } = await mountPage()
    expect(w.find('[data-state="loading"]').exists()).toBe(true)
    expect(w.get('[data-card="secrets"]').text()).toContain('180')
  })

  it('shows an empty state without routers', async () => {
    useRouters([])
    const { w } = await mountPage()
    expect(w.text()).toContain('Belum ada router')
    const link = w
      .findAllComponents(RouterLink)
      .find((l) => (l.props('to') as { name?: string }).name === 'mikrotik-routers')
    expect(link).toBeDefined()
  })

  it('no longer renders the control center in active mode', async () => {
    const { w } = await mountPage()
    expect(w.text()).not.toContain('Kendali Isolir')
    expect(w.text()).toContain('Aktif')
    const link = w
      .findAllComponents(RouterLink)
      .find((l) => (l.props('to') as { name?: string }).name === 'mikrotik-isolation')
    expect(link?.props('to')).toEqual({ name: 'mikrotik-isolation' })
  })

  it('shows the pending-restore banner with mikrotik_task.read', async () => {
    vi.mocked(mikrotikApi.tasks.summary).mockResolvedValue({
      counts: { pending: 3 },
      oldest_pending_restore_at: new Date(Date.now() - 12 * 60000).toISOString(),
    })
    const { w } = await mountPage(['mikrotik_task.read'])
    expect(w.text()).toMatch(/sudah bayar tapi belum dibuka/)
    expect(w.text()).toMatch(/tertua 1[12] menit/)
  })

  it('skips the pending-restore banner and its query without mikrotik_task.read', async () => {
    vi.mocked(mikrotikApi.tasks.summary).mockResolvedValue({
      counts: { pending: 3 },
      oldest_pending_restore_at: new Date().toISOString(),
    })
    const { w } = await mountPage(['mikrotik_control.read'])
    expect(w.text()).not.toMatch(/sudah bayar tapi belum dibuka/)
    expect(mikrotikApi.tasks.summary).not.toHaveBeenCalled()
  })

  it('never calls the control endpoint without mikrotik_control.read', async () => {
    const { w } = await mountPage([])
    expect(mikrotikApi.control.get).not.toHaveBeenCalled()
    expect(w.find('[data-card="isolation"]').exists()).toBe(false)
  })
})
