import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

import AccountsPage from '@/features/mikrotik/pages/AccountsPage.vue'
import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import { routerFixture, secret } from '@/features/mikrotik/testing/fixtures'
import { useAuthStore } from '@/stores/auth.store'
import type { Permission } from '@/types/auth'

vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: {
    routers: { list: vi.fn() },
    secrets: {
      list: vi.fn(),
      summary: vi.fn(),
      analyze: vi.fn(),
      import: vi.fn(),
      pairBulk: vi.fn(),
      pairNewCustomer: vi.fn(),
      unpair: vi.fn(),
      setOriginalProfile: vi.fn(),
    },
    accounts: { search: vi.fn().mockResolvedValue([]) },
  },
}))

const Stub = { template: '<div />' }

async function mountPage(permissions: Permission[] = ['mikrotik_secret.read'] as Permission[]) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().$patch((state) => {
    ;(state as { user: unknown }).user = { id: 'u', name: 'A', email: 'a@x.test', permissions }
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Stub },
      { path: '/app/mikrotik/routers', name: 'mikrotik-routers', component: Stub },
      { path: '/app/mikrotik/secrets/:id', name: 'mikrotik-secret-detail', component: Stub },
    ],
  })
  await router.push('/')
  const w = mount(AccountsPage, {
    attachTo: document.body,
    global: { plugins: [pinia, router, [VueQueryPlugin, { queryClient: new QueryClient() }]] },
  })
  await flushPromises()
  return { w, router }
}

describe('AccountsPage', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.mocked(mikrotikApi.routers.list)
      .mockReset()
      .mockResolvedValue({ data: [routerFixture({ id: 'r1' })], meta: { total: 1 } } as never)
    vi.mocked(mikrotikApi.secrets.list)
      .mockReset()
      .mockResolvedValue({
        data: [secret({ id: 's1', name: 'budi', disabled: true })],
        meta: { total: 1, page: 1, per_page: 20 },
      } as never)
    vi.mocked(mikrotikApi.secrets.summary)
      .mockReset()
      .mockResolvedValue({ active: 41, inactive: 3 })
  })

  it('menampilkan kartu aktif dan nonaktif dari summary', async () => {
    const { w } = await mountPage()
    expect(mikrotikApi.secrets.summary).toHaveBeenCalledWith({ router_id: 'r1' })
    const cards = w.get('[data-testid="secret-summary"]').text()
    expect(cards).toContain('Aktif')
    expect(cards).toContain('41')
    expect(cards).toContain('Nonaktif')
    expect(cards).toContain('3')
  })

  it('dropdown mengirim mapping_status dan tidak ada tab', async () => {
    const { w } = await mountPage()
    expect(w.findAll('[role="tab"]')).toHaveLength(0)
    expect(w.findAll('button').map((b) => b.text())).not.toContain('Butuh keputusan')
    await w.get('select[name="mapping_status"]').setValue('needs_decision')
    await flushPromises()
    expect(mikrotikApi.secrets.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ mapping_status: 'needs_decision', router_id: 'r1', page: 1 }),
    )
    const last = vi.mocked(mikrotikApi.secrets.list).mock.calls.at(-1)![0]
    expect(last).not.toHaveProperty('suggestion')
  })

  it('kolom Status dan klik baris menuju detail', async () => {
    const { w, router } = await mountPage()
    const row = w.get('tbody tr')
    expect(row.text()).toContain('Nonaktif')
    await row.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/app/mikrotik/secrets/s1')
  })
})
