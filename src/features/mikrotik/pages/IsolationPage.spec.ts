import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'

vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: {
    control: {
      get: vi.fn(),
      previewSummary: vi.fn(),
      preview: vi.fn(),
      setMode: vi.fn(),
      setGraceDays: vi.fn(),
      restoreAll: vi.fn(),
      activity: vi.fn(),
    },
    pilot: { list: vi.fn() },
    tasks: { list: vi.fn(), summary: vi.fn(), retry: vi.fn() },
    routers: { list: vi.fn() },
    policy: { set: vi.fn() },
  },
}))
vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn() }),
}))

import IsolationPage from '@/features/mikrotik/pages/IsolationPage.vue'
import ControlPanel from '@/features/mikrotik/components/ControlPanel.vue'
import LaunchPanel from '@/features/mikrotik/components/LaunchPanel.vue'
import TasksPanel from '@/features/mikrotik/components/TasksPanel.vue'
import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import { controlState, previewSummary } from '@/features/mikrotik/testing/fixtures'
import type { ControlState } from '@/features/mikrotik/types'
import { useAuthStore } from '@/stores/auth.store'
import type { Permission } from '@/types/auth'

const api = vi.mocked(mikrotikApi, true)
const OWNER = [
  'mikrotik_task.read',
  'mikrotik_control.read',
  'mikrotik_control.update',
  'mikrotik_control.restore',
] as Permission[]
const TASK_ONLY = ['mikrotik_task.read'] as Permission[]
const BANNER = 'Ada pemulihan yang tertunda: pelanggan sudah bayar tapi belum dibuka'

async function mountPage(
  control: Partial<ControlState>,
  {
    permissions = OWNER,
    url = '/mikrotik/isolation',
    controlResult,
  }: { permissions?: Permission[]; url?: string; controlResult?: Promise<never> } = {},
) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().$patch((s) => {
    ;(s as { user: unknown }).user = { id: 'u', name: 'A', email: 'a@x.test', permissions }
  })
  if (controlResult) api.control.get.mockReturnValue(controlResult)
  else api.control.get.mockResolvedValue(controlState(control))
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/mikrotik/isolation', name: 'mikrotik-isolation', component: { template: '<i/>' } },
      { path: '/app/whatsapp', name: 'whatsapp', component: { template: '<i/>' } },
      { path: '/app/email-accounts', name: 'email-accounts', component: { template: '<i/>' } },
    ],
  })
  await router.push(url)
  const push = vi.spyOn(router, 'push')
  const w = mount(IsolationPage, {
    attachTo: document.body,
    global: {
      // tests/setup.ts mematikan RouterLink secara global; di sini tautan perlu bisa diklik.
      stubs: { RouterLink: false },
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
  return { w, router, push }
}

describe('IsolationPage', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    Object.values(api.control).forEach((f) => f.mockReset())
    api.control.previewSummary.mockResolvedValue(previewSummary())
    api.control.preview.mockResolvedValue({ data: [], meta: { total: 0 } } as never)
    api.control.activity.mockResolvedValue({ data: [], meta: { total: 0 } } as never)
    api.pilot.list.mockResolvedValue([])
    api.tasks.list.mockReset().mockResolvedValue({ data: [], meta: { total: 0 } } as never)
    api.tasks.summary.mockReset().mockResolvedValue({ counts: {}, oldest_pending_restore_at: null })
    api.routers.list.mockResolvedValue({ data: [], meta: { total: 0 } } as never)
  })

  it.each(['simulation', 'pilot'] as const)(
    'mode %s: LaunchPanel, no ControlPanel, link to the task queue',
    async (mode) => {
      const { w } = await mountPage({ mode })
      expect(w.get('h1').text()).toBe('Isolir')
      expect(w.text()).toContain('Luncurkan isolir otomatis: simulasi, uji pilot, lalu aktifkan.')
      expect(w.findComponent(LaunchPanel).exists()).toBe(true)
      expect(w.findComponent(ControlPanel).exists()).toBe(false)
      expect(w.findComponent(TasksPanel).exists()).toBe(false)
      expect(w.find('[role="tablist"]').exists()).toBe(false)
      expect(w.text()).toContain('Lihat antrean tugas')
    },
  )

  it('mode simulation badge says Simulasi', async () => {
    const { w } = await mountPage({ mode: 'simulation' })
    expect(w.get('[data-testid="mode-badge"]').text()).toBe('Simulasi')
  })

  it('launch stage: "Lihat antrean tugas" opens the queue, "Kembali ke peluncuran" returns', async () => {
    const { w, router } = await mountPage({ mode: 'pilot' })
    await w
      .findAll('a')
      .find((a) => a.text() === 'Lihat antrean tugas')!
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ tab: 'tasks' })
    expect(w.findComponent(TasksPanel).exists()).toBe(true)
    expect(w.findComponent(LaunchPanel).exists()).toBe(false)
    await w
      .findAll('a')
      .find((a) => a.text() === 'Kembali ke peluncuran')!
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({})
    expect(w.findComponent(LaunchPanel).exists()).toBe(true)
  })

  it('mode active without query: Kendali tab selected and ControlPanel shown', async () => {
    const { w } = await mountPage({ mode: 'active' })
    expect(w.text()).toContain('Jeda, pulihkan, dan pantau isolir otomatis.')
    expect(w.get('[data-testid="mode-badge"]').text()).toBe('Aktif')
    const tabs = w.findAll('nav[aria-label="Isolir"] a')
    expect(tabs.map((t) => t.text())).toEqual(['Kendali', 'Tugas'])
    expect(tabs[0]!.attributes('aria-current')).toBe('page')
    expect(tabs[1]!.attributes('aria-current')).toBeUndefined()
    expect(w.find('[role="tab"]').exists()).toBe(false)
    expect(w.findComponent(ControlPanel).exists()).toBe(true)
    expect(w.findComponent(TasksPanel).exists()).toBe(false)
    expect(w.findComponent(LaunchPanel).exists()).toBe(false)
  })

  it('mode paused with ?tab=tasks&status=failed: TasksPanel with the status preselected', async () => {
    const { w } = await mountPage(
      { mode: 'paused' },
      { url: '/mikrotik/isolation?tab=tasks&status=failed' },
    )
    expect(w.get('[data-testid="mode-badge"]').text()).toBe('Dijeda')
    expect(w.findAll('nav[aria-label="Isolir"] a')[1]!.attributes('aria-current')).toBe('page')
    expect(w.findComponent(TasksPanel).exists()).toBe(true)
    expect(w.findComponent(ControlPanel).exists()).toBe(false)
    expect(api.tasks.list).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }))
  })

  it('clicking the Tugas tab switches to the queue', async () => {
    const { w, router } = await mountPage({ mode: 'active' })
    await w.findAll('nav[aria-label="Isolir"] a')[1]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.tab).toBe('tasks')
    expect(w.findComponent(TasksPanel).exists()).toBe(true)
  })

  it('clicking the already-active Tugas link keeps status and router_id', async () => {
    const { w, router } = await mountPage(
      { mode: 'active' },
      { url: '/mikrotik/isolation?tab=tasks&status=failed&router_id=r9' },
    )
    await w.findAll('nav[aria-label="Isolir"] a')[1]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({
      tab: 'tasks',
      status: 'failed',
      router_id: 'r9',
    })
  })

  it('show-failed-tasks from ControlPanel pushes tab=tasks&status=failed', async () => {
    const { w, push } = await mountPage({ mode: 'active' })
    w.findComponent(ControlPanel).vm.$emit('show-failed-tasks')
    await flushPromises()
    expect(push).toHaveBeenCalledWith({ query: { tab: 'tasks', status: 'failed' } })
    expect(w.findComponent(TasksPanel).exists()).toBe(true)
    expect(api.tasks.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'failed' }))
  })

  it('only mikrotik_task.read: no /control request, TasksPanel only', async () => {
    const { w } = await mountPage({ mode: 'active' }, { permissions: TASK_ONLY })
    expect(api.control.get).not.toHaveBeenCalled()
    expect(w.text()).toContain('Antrean isolir dan pemulihan PPPoE.')
    expect(w.findComponent(TasksPanel).exists()).toBe(true)
    expect(w.findComponent(ControlPanel).exists()).toBe(false)
    expect(w.findComponent(LaunchPanel).exists()).toBe(false)
    expect(w.find('[role="tablist"]').exists()).toBe(false)
    expect(w.find('[data-testid="mode-badge"]').exists()).toBe(false)
  })

  it('shows Memuat... while the control query is loading', async () => {
    const { w } = await mountPage({}, { controlResult: new Promise<never>(() => {}) })
    expect(w.get('[role="status"]').text()).toBe('Memuat...')
    expect(w.findComponent(ControlPanel).exists()).toBe(false)
    expect(w.findComponent(LaunchPanel).exists()).toBe(false)
  })

  it('control query error: message and Coba lagi refetches', async () => {
    const failed = Promise.reject(new Error('boom'))
    failed.catch(() => {})
    const { w } = await mountPage({}, { controlResult: failed as Promise<never> })
    const alert = w.get('[role="alert"]')
    expect(alert.text()).toContain('Gagal memuat status kendali.')
    const calls = api.control.get.mock.calls.length
    await alert.get('button').trigger('click')
    await flushPromises()
    expect(api.control.get.mock.calls.length).toBeGreaterThan(calls)
  })

  it.each([
    ['active', ''],
    ['pilot', ''],
    ['paused', '?tab=tasks'],
  ] as const)('pending-restore banner renders exactly once (%s %s)', async (mode, query) => {
    api.tasks.summary.mockResolvedValue({
      counts: { failed: 1 },
      oldest_pending_restore_at: new Date(Date.now() - 12 * 60_000).toISOString(),
    })
    const { w } = await mountPage({ mode }, { url: `/mikrotik/isolation${query}` })
    const banners = w.findAll('[role="alert"]').filter((a) => a.text().includes(BANNER))
    expect(banners).toHaveLength(1)
    expect(banners[0]!.text()).toMatch(/tertua 1[12] menit\)\./)
  })

  it('no banner when there is no pending restore', async () => {
    const { w } = await mountPage({ mode: 'active' })
    expect(w.text()).not.toContain(BANNER)
  })
})
