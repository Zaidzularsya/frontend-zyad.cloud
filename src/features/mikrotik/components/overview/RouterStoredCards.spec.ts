import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, RouterLink } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'
import type { Permission } from '@/types/auth'
import RouterStoredCards from '@/features/mikrotik/components/overview/RouterStoredCards.vue'
import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import { routerFixture, taskFixture } from '@/features/mikrotik/testing/fixtures'
import type { Router, RouterSummary } from '@/features/mikrotik/types'

vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: {
    tasks: { list: vi.fn() },
    routers: { check: vi.fn() },
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

async function mountCards(permissions: Permission[], router: Router = routerFixture()) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().$patch((st) => {
    ;(st as { user: unknown }).user = { id: 'u', name: 'A', email: 'a@x.test', permissions }
  })
  const vr = createRouter({
    history: createMemoryHistory(),
    routes: ['mikrotik', 'mikrotik-routers', 'mikrotik-accounts', 'mikrotik-isolation'].map(
      (name) => ({ path: `/${name}`, name, component: { template: '<i/>' } }),
    ),
  })
  await vr.push('/mikrotik')
  const w = mount(RouterStoredCards, {
    props: { router, summary, summaryLoading: false, summaryError: false },
    global: {
      plugins: [
        pinia,
        vr,
        [
          VueQueryPlugin,
          { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        ],
      ],
    },
  })
  await flushPromises()
  return w
}

function linkTo(w: Awaited<ReturnType<typeof mountCards>>, name: string) {
  return w
    .findAllComponents(RouterLink)
    .find((l) => (l.props('to') as { name?: string }).name === name)
}

describe('RouterStoredCards', () => {
  beforeEach(() => {
    vi.mocked(mikrotikApi.tasks.list)
      .mockReset()
      .mockResolvedValue({
        data: [taskFixture({ status: 'failed', last_error_code: 'unreachable' })],
        meta: { page: 1, per_page: 5, total: 1, total_pages: 1 },
      } as never)
  })

  it('offers "Jalankan Setup" for a router that is not ready, with setup permission', async () => {
    const w = await mountCards(['mikrotik_router.setup'])
    expect(w.text()).toContain('Belum siap')
    const link = linkTo(w, 'mikrotik-routers')
    expect(link?.props('to')).toEqual({
      name: 'mikrotik-routers',
      query: { setup: '1', router_id: 'r1' },
    })
  })

  it('hides "Jalankan Setup" without setup permission', async () => {
    const w = await mountCards([])
    expect(linkTo(w, 'mikrotik-routers')).toBeUndefined()
  })

  it('hides "Jalankan Setup" once the router is ready', async () => {
    const w = await mountCards(
      ['mikrotik_router.setup'],
      routerFixture({ isolir_ready: true, isolir_profile_name: 'zyad-isolir' }),
    )
    expect(w.text()).toContain('Siap')
    expect(w.text()).toContain('zyad-isolir')
    expect(linkTo(w, 'mikrotik-routers')).toBeUndefined()
  })

  it('shows secret counts from the summary', async () => {
    const w = await mountCards([])
    const card = w.get('[data-card="secrets"]')
    expect(card.text()).toContain('180')
    expect(card.text()).toContain('150')
    expect(card.text()).toContain('Hilang dari router')
    expect(w.get('[data-card="isolated"]').text()).toContain('7')
  })

  it('hides the task card without mikrotik_task.read', async () => {
    const w = await mountCards([])
    expect(w.find('[data-card="tasks"]').exists()).toBe(false)
    expect(mikrotikApi.tasks.list).not.toHaveBeenCalled()
  })

  it('shows router tasks with mikrotik_task.read', async () => {
    const w = await mountCards(['mikrotik_task.read'])
    const card = w.get('[data-card="tasks"]')
    expect(card.text()).toContain('Router tidak terjangkau')
    expect(mikrotikApi.tasks.list).toHaveBeenCalledWith({
      router_id: 'r1',
      status: 'failed',
      limit: 5,
    })
    expect(linkTo(w, 'mikrotik-isolation')?.props('to')).toEqual({
      name: 'mikrotik-isolation',
      query: { tab: 'tasks', router_id: 'r1' },
    })
  })

  it('shows "Cek sekarang" only with mikrotik_router.update', async () => {
    expect((await mountCards([])).text()).not.toContain('Cek sekarang')
    expect((await mountCards(['mikrotik_router.update'])).text()).toContain('Cek sekarang')
  })
})
