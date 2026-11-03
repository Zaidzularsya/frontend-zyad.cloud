import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, RouterLink } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'
import type { Permission } from '@/types/auth'
import OverviewPage from '@/features/mikrotik/pages/OverviewPage.vue'
import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import { controlState, onboarding } from '@/features/mikrotik/testing/fixtures'

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
    routers: { list: vi.fn().mockResolvedValue({ data: [], meta: {} }) },
  },
}))

async function mountPage(permissions: Permission[] = ['mikrotik_control.read']) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().$patch((st) => {
    ;(st as { user: unknown }).user = { id: 'u', name: 'A', email: 'a@x.test', permissions }
  })
  const names = [
    'mikrotik',
    'mikrotik-routers',
    'mikrotik-accounts',
    'mikrotik-tasks',
    'mikrotik-launch',
    'crm-products',
    'billing-receivable-settings',
  ]
  const router = createRouter({
    history: createMemoryHistory(),
    routes: names.map((name) => ({ path: `/${name}`, name, component: { template: '<i/>' } })),
  })
  await router.push('/mikrotik')
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
  return w
}

describe('OverviewPage', () => {
  beforeEach(() => {
    vi.mocked(mikrotikApi.tasks.summary)
      .mockReset()
      .mockResolvedValue({
        counts: { pending: 2, failed: 1 },
        oldest_pending_restore_at: null,
      })
    vi.mocked(mikrotikApi.tasks.list)
      .mockReset()
      .mockResolvedValue({
        data: [
          {
            id: 't1',
            action: 'isolate',
            status: 'failed',
            priority: 0,
            attempts: 3,
            next_attempt_at: '',
            last_error_code: 'unreachable',
            last_error: '',
            router: { id: 'r1', name: 'Core-1' },
            secret: { id: 's1', name: 'budi' },
            account: { id: 'a1', name: 'Budi' },
            created_at: '2026-11-01T00:00:00Z',
            finished_at: null,
          },
        ],
        meta: { page: 1, per_page: 5, total: 1, total_pages: 1 },
      } as never)
  })

  it('shows the checklist while onboarding is incomplete', async () => {
    vi.mocked(mikrotikApi.onboarding.get).mockResolvedValue(onboarding())
    const w = await mountPage()
    expect(w.findAll('[data-step]')).toHaveLength(5)
    expect(w.text()).not.toContain('Tugas gagal terbaru')
  })

  it('shows the operations summary once complete', async () => {
    vi.mocked(mikrotikApi.onboarding.get).mockResolvedValue(onboarding({ complete: true }))
    const w = await mountPage()
    expect(w.findAll('[data-step]')).toHaveLength(0)
    expect(w.text()).toContain('Tugas gagal terbaru')
    expect(w.text()).toContain('Router tidak terjangkau')
  })

  it('shows the red banner when restores are pending', async () => {
    vi.mocked(mikrotikApi.onboarding.get).mockResolvedValue(onboarding({ complete: true }))
    vi.mocked(mikrotikApi.tasks.summary).mockResolvedValue({
      counts: { pending: 3 },
      oldest_pending_restore_at: new Date(Date.now() - 12 * 60000).toISOString(),
    })
    const w = await mountPage()
    expect(w.text()).toMatch(/sudah bayar tapi belum dibuka/)
    expect(w.text()).toMatch(/tertua 1[12] menit/)
  })

  describe('once onboarding is complete', () => {
    beforeEach(() => {
      vi.mocked(mikrotikApi.onboarding.get).mockResolvedValue(onboarding({ complete: true }))
      vi.mocked(mikrotikApi.control.get).mockReset()
    })

    it.each(['active', 'paused'] as const)('shows the control center in %s mode', async (mode) => {
      vi.mocked(mikrotikApi.control.get).mockResolvedValue(controlState({ mode }))
      const w = await mountPage()
      expect(w.text()).toContain('Kendali Isolir')
      expect(w.text()).not.toContain('Ringkasan Jaringan')
    })

    it.each(['simulation', 'pilot'] as const)('links to the wizard in %s mode', async (mode) => {
      vi.mocked(mikrotikApi.control.get).mockResolvedValue(controlState({ mode }))
      const w = await mountPage()
      expect(w.text()).toContain('Tugas gagal terbaru')
      const cta = w
        .findAllComponents(RouterLink)
        .find((l) => (l.props('to') as { name?: string }).name === 'mikrotik-launch')
      expect(cta).toBeDefined()
    })

    it('shows the loading state, not the old summary, while the control query is loading', async () => {
      vi.mocked(mikrotikApi.control.get).mockReturnValue(new Promise(() => {}))
      const w = await mountPage()
      expect(w.text()).toContain('Memuat...')
      expect(w.text()).not.toContain('Tugas gagal terbaru')
      expect(w.text()).not.toContain('Buka Peluncuran Isolir')
    })

    it('keeps the summary when the control query fails', async () => {
      vi.mocked(mikrotikApi.control.get).mockRejectedValue(new Error('boom'))
      const w = await mountPage()
      expect(w.text()).toContain('Tugas gagal terbaru')
      expect(w.text()).not.toContain('Buka Peluncuran Isolir')
    })

    it('never calls the control endpoint without mikrotik_control.read', async () => {
      const w = await mountPage([])
      expect(mikrotikApi.control.get).not.toHaveBeenCalled()
      expect(w.text()).toContain('Tugas gagal terbaru')
      expect(w.text()).not.toContain('Buka Peluncuran Isolir')
    })
  })
})
