import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: {
    pilot: { list: vi.fn(), add: vi.fn(), remove: vi.fn(), startTest: vi.fn(), stopTest: vi.fn() },
    tasks: { list: vi.fn() },
    accounts: { search: vi.fn() },
  },
}))
vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn() }),
}))

import PilotPanel from '@/features/mikrotik/components/PilotPanel.vue'
import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import { controlState, pilotAccount, taskFixture } from '@/features/mikrotik/testing/fixtures'
import { CONTROL_OWNER_ONLY_TOOLTIP } from '@/features/mikrotik/utils/control-permissions'
import type { ControlState } from '@/features/mikrotik/types'

const api = vi.mocked(mikrotikApi, true)

async function mountPanel(control: Partial<ControlState> = {}, canUpdate = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const w = mount(PilotPanel, {
    attachTo: document.body,
    props: { control: controlState({ mode: 'pilot', ...control }), canUpdate },
    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
  })
  await flushPromises()
  return w
}

const buttonByText = (w: ReturnType<typeof mount>, text: string) =>
  w.findAll('button').find((b) => b.text() === text)

describe('PilotPanel', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    Object.values(api.pilot).forEach((f) => (f as ReturnType<typeof vi.fn>).mockReset())
    api.pilot.list.mockResolvedValue([pilotAccount()])
    api.pilot.startTest.mockResolvedValue({ test_until: '2026-11-02T03:10:00Z' })
    api.pilot.stopTest.mockResolvedValue(undefined as never)
    api.tasks.list.mockReset().mockResolvedValue({ data: [], meta: {} } as never)
  })
  afterEach(() => vi.useRealTimers())

  it('menjelaskan akun menunggak tetap terisolir setelah jendela uji 10 menit', async () => {
    const w = await mountPanel()
    expect(w.text()).toContain(
      'Akun pilot yang juga menunggak tetap terisolir setelah jendela uji 10 menit berakhir.',
    )
  })

  it('menampilkan Uji Isolir hanya pada mode pilot dengan engine on', async () => {
    expect(buttonByText(await mountPanel(), 'Uji Isolir')).toBeTruthy()
    expect(buttonByText(await mountPanel({ engine: 'off' }), 'Uji Isolir')).toBeUndefined()
    expect(buttonByText(await mountPanel({ engine: 'dry_run' }), 'Uji Isolir')).toBeUndefined()
    expect(buttonByText(await mountPanel({ mode: 'simulation' }), 'Uji Isolir')).toBeUndefined()
  })

  it('memanggil StartPilotTest untuk akun terpilih', async () => {
    const w = await mountPanel()
    await buttonByText(w, 'Uji Isolir')!.trigger('click')
    await flushPromises()
    expect(api.pilot.startTest).toHaveBeenCalledWith('a1')
  })

  it('menampilkan Hentikan Uji, status tugas, dan memanggil StopPilotTest', async () => {
    api.pilot.list.mockResolvedValue([
      pilotAccount({ test_active: true, test_until: '2026-11-02T03:10:00Z' }),
    ])
    api.tasks.list.mockResolvedValue({
      data: [taskFixture({ status: 'running', account: { id: 'a1', name: 'Budi' } })],
      meta: {},
    } as never)
    const w = await mountPanel()
    expect(w.text()).toContain('Tugas isolir: Berjalan')
    expect(buttonByText(w, 'Uji Isolir')).toBeUndefined()
    await buttonByText(w, 'Hentikan Uji')!.trigger('click')
    await flushPromises()
    expect(api.pilot.stopTest).toHaveBeenCalledWith('a1')
  })

  it('polling status tugas selama uji berjalan', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    api.pilot.list.mockResolvedValue([pilotAccount({ test_active: true })])
    await mountPanel()
    const before = api.tasks.list.mock.calls.length
    await vi.advanceTimersByTimeAsync(3100)
    expect(api.tasks.list.mock.calls.length).toBeGreaterThan(before)
  })

  it('menandai akun terverifikasi', async () => {
    api.pilot.list.mockResolvedValue([pilotAccount({ verified: true })])
    const w = await mountPanel()
    expect(w.text()).toContain('Terverifikasi')
  })

  it('member melihat daftar tetapi kontrol nonaktif dengan tooltip persis', async () => {
    const w = await mountPanel({}, false)
    expect(w.text()).toContain('Budi Santoso')
    const test = buttonByText(w, 'Uji Isolir')!
    expect(test.attributes('disabled')).toBeDefined()
    expect(test.attributes('title')).toBe(CONTROL_OWNER_ONLY_TOOLTIP)
    expect(buttonByText(w, 'Tambah akun pilot')!.attributes('disabled')).toBeDefined()
    expect(buttonByText(w, 'Lepas')!.attributes('disabled')).toBeDefined()
  })

  it('menampilkan galat MIKROTIK_ENGINE_OFF dari backend', async () => {
    api.pilot.startTest.mockRejectedValue({
      response: { data: { code: 'MIKROTIK_ENGINE_OFF', message: 'x' } },
    })
    const w = await mountPanel()
    await buttonByText(w, 'Uji Isolir')!.trigger('click')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toContain('Mesin isolir dinonaktifkan operator')
  })
})
