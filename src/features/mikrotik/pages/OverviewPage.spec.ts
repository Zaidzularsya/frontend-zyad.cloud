import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createRouter, createMemoryHistory } from 'vue-router'

import OverviewPage from '@/features/mikrotik/pages/OverviewPage.vue'
import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import { onboarding } from '@/features/mikrotik/testing/fixtures'

vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: {
    onboarding: { get: vi.fn() },
    tasks: { summary: vi.fn(), list: vi.fn() },
  },
}))

async function mountPage() {
  const names = [
    'mikrotik',
    'mikrotik-routers',
    'mikrotik-accounts',
    'mikrotik-tasks',
    'crm-products',
    'billing-receivable-settings',
  ]
  const router = createRouter({
    history: createMemoryHistory(),
    routes: names.map((name) => ({ path: `/${name}`, name, component: { template: '<i/>' } })),
  })
  await router.push('/mikrotik')
  const w = mount(OverviewPage, {
    global: { plugins: [router, [VueQueryPlugin, { queryClient: new QueryClient() }]] },
  })
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
})
