import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter, RouterLink } from 'vue-router'

import RoutersPage from '@/features/mikrotik/pages/RoutersPage.vue'
import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import { planFixture, routerFixture } from '@/features/mikrotik/testing/fixtures'
import { useAuthStore } from '@/stores/auth.store'
import type { Permission } from '@/types/auth'

vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: {
    routers: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), check: vi.fn() },
    setup: { preview: vi.fn(), apply: vi.fn(), cleanup: vi.fn() },
    secrets: { list: vi.fn() },
  },
}))

const ALL: Permission[] = [
  'mikrotik_router.read',
  'mikrotik_router.create',
  'mikrotik_router.update',
  'mikrotik_router.delete',
  'mikrotik_router.setup',
] as Permission[]

const R1 = routerFixture({ id: 'r1', name: 'Core-1' })
const R2 = routerFixture({ id: 'r2', name: 'Edge-2' })

async function mountPage(permissions: Permission[], url = '/mikrotik/routers') {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().$patch((state) => {
    ;(state as { user: unknown }).user = { id: 'u', name: 'A', email: 'a@x.test', permissions }
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/mikrotik/routers', name: 'mikrotik-routers', component: { template: '<i/>' } },
      { path: '/mikrotik/tasks', name: 'mikrotik-tasks', component: { template: '<i/>' } },
    ],
  })
  await router.push(url)
  const w = mount(RoutersPage, {
    attachTo: document.body,
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
  return w
}

const buttons = () => Array.from(document.body.querySelectorAll('button'))
const find = (label: string) => buttons().find((b) => b.textContent?.trim() === label)

describe('RoutersPage', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.mocked(mikrotikApi.routers.list)
      .mockReset()
      .mockResolvedValue({ data: [R1], meta: { total: 1 } } as never)
    vi.mocked(mikrotikApi.secrets.list)
      .mockReset()
      .mockResolvedValue({ data: [], meta: { total: 7 } } as never)
    vi.mocked(mikrotikApi.routers.remove).mockReset().mockResolvedValue(undefined)
    vi.mocked(mikrotikApi.setup.cleanup).mockReset().mockResolvedValue(R1)
    vi.mocked(mikrotikApi.setup.preview).mockReset().mockResolvedValue(planFixture())
  })

  it('shows all actions with every permission and the secret count', async () => {
    await mountPage(ALL)
    for (const l of ['Tambah Router', 'Ubah', 'Hapus', 'Setup isolir', 'Bersihkan']) {
      expect(find(l), l).toBeDefined()
    }
    expect(document.body.textContent).toContain('7')
  })

  it.each([
    ['mikrotik_router.create', 'Tambah Router'],
    ['mikrotik_router.update', 'Ubah'],
    ['mikrotik_router.delete', 'Hapus'],
    ['mikrotik_router.setup', 'Setup isolir'],
    ['mikrotik_router.setup', 'Bersihkan'],
  ])('hides %s action %s without the permission', async (perm, label) => {
    await mountPage(ALL.filter((p) => p !== perm))
    expect(find(label)).toBeUndefined()
  })

  it('requires confirmation before cleanup', async () => {
    await mountPage(ALL)
    find('Bersihkan')?.click()
    await flushPromises()
    expect(mikrotikApi.setup.cleanup).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Hanya objek yang dikelola zyad')
    const confirm = buttons().filter((b) => b.textContent?.trim() === 'Bersihkan')
    confirm[confirm.length - 1]?.click()
    await flushPromises()
    expect(mikrotikApi.setup.cleanup).toHaveBeenCalledWith('r1')
  })

  it('explains a 409 delete, links to tasks, and clears the banner on dismiss and retry', async () => {
    vi.mocked(mikrotikApi.routers.remove).mockRejectedValueOnce({
      response: { data: { code: 'MIKROTIK_ROUTER_HAS_ISOLATED_SECRETS', message: 'x' } },
    })
    const w = await mountPage(ALL)
    find('Hapus')?.click()
    await flushPromises()
    const confirmDelete = () =>
      buttons()
        .filter((b) => b.textContent?.trim() === 'Hapus')
        .pop()
    confirmDelete()?.click()
    await flushPromises()
    const alert = w.get('[role="alert"]')
    expect(alert.text()).toContain('masih punya secret terisolir')
    expect(alert.findComponent(RouterLink).props('to')).toEqual({ name: 'mikrotik-tasks' })

    // dismiss
    await alert.get('button').trigger('click')
    expect(w.find('[role="alert"]').exists()).toBe(false)

    // blocked again, then starting another delete clears it, success keeps it cleared
    vi.mocked(mikrotikApi.routers.remove).mockRejectedValueOnce({
      response: { data: { code: 'MIKROTIK_ROUTER_HAS_ISOLATED_SECRETS', message: 'x' } },
    })
    find('Hapus')?.click()
    await flushPromises()
    confirmDelete()?.click()
    await flushPromises()
    expect(w.find('[role="alert"]').exists()).toBe(true)
    find('Hapus')?.click()
    await flushPromises()
    expect(w.find('[role="alert"]').exists()).toBe(false)
    confirmDelete()?.click()
    await flushPromises()
    expect(w.find('[role="alert"]').exists()).toBe(false)
    expect(mikrotikApi.routers.remove).toHaveBeenCalledTimes(3)
  })

  it('auto-opens setup for a single router with ?setup=1', async () => {
    await mountPage(ALL, '/mikrotik/routers?setup=1')
    expect(document.body.textContent).toContain('Setup isolir: Core-1')
  })

  it('opens the router matching router_id', async () => {
    vi.mocked(mikrotikApi.routers.list).mockResolvedValue({
      data: [R1, R2],
      meta: { total: 2 },
    } as never)
    await mountPage(ALL, '/mikrotik/routers?setup=1&router_id=r2')
    expect(document.body.textContent).toContain('Setup isolir: Edge-2')
  })

  it('shows a hint instead of opening when several routers and no router_id', async () => {
    vi.mocked(mikrotikApi.routers.list).mockResolvedValue({
      data: [R1, R2],
      meta: { total: 2 },
    } as never)
    await mountPage(ALL, '/mikrotik/routers?setup=1')
    expect(document.body.textContent).not.toContain('Setup isolir: ')
    expect(document.body.textContent).toContain('Pilih router lalu klik Setup isolir')
  })

  it('does not auto-open without the setup permission', async () => {
    await mountPage(
      ALL.filter((p) => p !== 'mikrotik_router.setup'),
      '/mikrotik/routers?setup=1',
    )
    expect(document.body.textContent).not.toContain('Setup isolir: ')
  })

  it('opens late when permissions arrive after routers loaded', async () => {
    const w = await mountPage(
      ALL.filter((p) => p !== 'mikrotik_router.setup'),
      '/mikrotik/routers?setup=1',
    )
    expect(document.body.textContent).not.toContain('Setup isolir: ')
    useAuthStore().$patch((state) => {
      ;(state as { user: { permissions: Permission[] } }).user.permissions = ALL
    })
    await flushPromises()
    expect(document.body.textContent).toContain('Setup isolir: Core-1')
    w.unmount()
  })

  it('M3: shows an error state with retry instead of the empty message when the list fails', async () => {
    vi.mocked(mikrotikApi.routers.list).mockReset().mockRejectedValueOnce(new Error('boom'))
    await mountPage(ALL)
    expect(document.body.textContent).toContain('Gagal memuat router. Coba lagi.')
    expect(document.body.textContent).not.toContain('Belum ada router terdaftar.')
    vi.mocked(mikrotikApi.routers.list).mockResolvedValue({
      data: [R1],
      meta: { total: 1 },
    } as never)
    find('Coba lagi')?.click()
    await flushPromises()
    expect(document.body.textContent).toContain('Core-1')
  })

  it('M2: shows a readable label for a known last_check_status', async () => {
    vi.mocked(mikrotikApi.routers.list)
      .mockReset()
      .mockResolvedValue({
        data: [routerFixture({ id: 'r1', name: 'Core-1', last_check_status: 'auth_failed' })],
        meta: { total: 1 },
      } as never)
    await mountPage(ALL)
    expect(document.body.textContent).toContain('Kredensial ditolak')
  })
})
