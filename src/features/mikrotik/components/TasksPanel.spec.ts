import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

import TasksPanel from '@/features/mikrotik/components/TasksPanel.vue'
import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import { routerFixture, taskFixture } from '@/features/mikrotik/testing/fixtures'
import type { TaskStatus } from '@/features/mikrotik/types'
import { useAuthStore } from '@/stores/auth.store'
import type { Permission } from '@/types/auth'

vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: {
    routers: { list: vi.fn() },
    tasks: { list: vi.fn(), summary: vi.fn(), retry: vi.fn() },
  },
}))

const FAILED = taskFixture({ id: 'tf', status: 'failed', last_error_code: 'unreachable' })

async function mountPage(
  permissions: Permission[],
  props: { initialStatus?: TaskStatus; initialRouterId?: string } = {},
  router?: Router,
) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().$patch((state) => {
    ;(state as { user: unknown }).user = { id: 'u', name: 'A', email: 'a@x.test', permissions }
  })
  const w = mount(TasksPanel, {
    props,
    attachTo: document.body,
    global: {
      plugins: [
        pinia,
        ...(router ? [router] : []),
        [VueQueryPlugin, { queryClient: new QueryClient() }],
      ] as never,
    },
  })
  await flushPromises()
  return w
}

const READ = ['mikrotik_task.read'] as Permission[]
const OWNER = ['mikrotik_task.read', 'mikrotik_task.retry', 'mikrotik_router.read'] as Permission[]

describe('TasksPanel', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.mocked(mikrotikApi.routers.list)
      .mockReset()
      .mockResolvedValue({ data: [routerFixture({ id: 'r1' })], meta: { total: 1 } } as never)
    vi.mocked(mikrotikApi.tasks.list)
      .mockReset()
      .mockResolvedValue({ data: [FAILED], meta: { total: 1, page: 1, per_page: 20 } } as never)
    vi.mocked(mikrotikApi.tasks.summary)
      .mockReset()
      .mockResolvedValue({
        counts: { pending: 2, failed: 1 },
        oldest_pending_restore_at: null,
      })
    vi.mocked(mikrotikApi.tasks.retry).mockReset().mockResolvedValue(FAILED)
  })

  it('queries with limit/offset and re-queries with the status and router filters', async () => {
    const w = await mountPage(OWNER)
    expect(mikrotikApi.tasks.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ limit: 20, offset: 0 }),
    )
    await w.get('select[name="status"]').setValue('failed')
    await flushPromises()
    expect(mikrotikApi.tasks.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'failed', limit: 20, offset: 0 }),
    )
    await w.get('select[name="router"]').setValue('r1')
    await flushPromises()
    expect(mikrotikApi.tasks.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'failed', router_id: 'r1' }),
    )
  })

  it('shows summary chips; the pending-restore banner is rendered by the page, not the panel', async () => {
    vi.mocked(mikrotikApi.tasks.summary).mockResolvedValue({
      counts: { pending: 2, failed: 1 },
      oldest_pending_restore_at: new Date(Date.now() - 12 * 60_000).toISOString(),
    })
    const w = await mountPage(OWNER)
    expect(w.text()).not.toContain('pelanggan sudah bayar tapi belum dibuka')
    expect(w.text()).toMatch(/Menunggu\s*2/)
  })

  it('retries a failed task for an owner', async () => {
    const w = await mountPage(OWNER)
    await w
      .findAll('button')
      .find((b) => b.text() === 'Coba Lagi')
      ?.trigger('click')
    await flushPromises()
    expect(mikrotikApi.tasks.retry).toHaveBeenCalledWith('tf')
  })

  it('lets a member read the page but keeps retry disabled', async () => {
    const w = await mountPage(READ)
    const btn = w.findAll('button').find((b) => b.text() === 'Coba Lagi')
    expect(btn?.attributes('disabled')).toBeDefined()
    expect(btn?.attributes('title')).toBe(
      'Hanya Pemilik Organisasi yang dapat mengubah pengaturan ini.',
    )
  })

  it('a member without router.read fires no routers request and hides the router filter', async () => {
    const w = await mountPage(READ)
    expect(mikrotikApi.routers.list).not.toHaveBeenCalled()
    expect(w.find('select[name="router"]').exists()).toBe(false)
    expect(mikrotikApi.tasks.list).toHaveBeenCalled()
  })

  it('preselects the filters from the initialStatus/initialRouterId props', async () => {
    await mountPage(OWNER, { initialStatus: 'failed', initialRouterId: 'r1' })
    expect(mikrotikApi.tasks.list).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', router_id: 'r1' }),
    )
  })

  it('ignores an unknown initialStatus', async () => {
    await mountPage(READ, { initialStatus: 'bogus' as TaskStatus })
    expect(mikrotikApi.tasks.list).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ status: expect.anything() }),
    )
  })

  it('writes the filters to the query string, keeping other query keys', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/t', component: { template: '<i/>' } }],
    })
    await router.push('/t?tab=tasks')
    const w = await mountPage(OWNER, {}, router)
    await w.get('select[name="status"]').setValue('failed')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ tab: 'tasks', status: 'failed' })
    await w.get('select[name="router"]').setValue('r1')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({
      tab: 'tasks',
      status: 'failed',
      router_id: 'r1',
    })
    await w.get('select[name="status"]').setValue('')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ tab: 'tasks', router_id: 'r1' })
  })
})
