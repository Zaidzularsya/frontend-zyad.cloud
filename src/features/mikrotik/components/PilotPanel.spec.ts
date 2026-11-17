import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
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

function describedText(
  w: ReturnType<typeof mount>,
  btn: { attributes: (n: string) => string | undefined },
) {
  const id = btn.attributes('aria-describedby')
  return id ? w.find(`#${id}`).text() : undefined
}

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

  it('Uji Isolir aktif hanya pada mode pilot dengan engine on; engine lain tampil nonaktif', async () => {
    const on = buttonByText(await mountPanel(), 'Uji Isolir')!
    expect(on.attributes('aria-disabled')).toBeUndefined()

    const off = await mountPanel({ engine: 'off' })
    const offBtn = buttonByText(off, 'Uji Isolir')!
    expect(offBtn.attributes('aria-disabled')).toBe('true')
    expect(describedText(off, offBtn)).toBe('Mesin isolir dinonaktifkan operator')
    expect(buttonByText(off, 'Tambah akun pilot')!.attributes('aria-disabled')).toBe('true')
    // Backend tidak mensyaratkan engine on untuk melepas akun pilot.
    expect(buttonByText(off, 'Lepas')!.attributes('aria-disabled')).toBeUndefined()

    const dry = await mountPanel({ engine: 'dry_run' })
    expect(describedText(dry, buttonByText(dry, 'Uji Isolir')!)).toBe(
      'Mesin isolir operator dalam mode uji (dry-run): tidak ada koneksi yang diputus.',
    )

    expect(buttonByText(await mountPanel({ mode: 'simulation' }), 'Uji Isolir')).toBeUndefined()
  })

  it('klik pada Uji Isolir yang aria-disabled tidak memanggil API', async () => {
    const w = await mountPanel({ engine: 'off' })
    await buttonByText(w, 'Uji Isolir')!.trigger('click')
    await flushPromises()
    expect(api.pilot.startTest).not.toHaveBeenCalled()
  })

  it('MIKROTIK_ACCOUNT_NOT_FOUND pada tambah akun pilot ditampilkan dalam bahasa Indonesia', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    api.accounts.search.mockResolvedValue([
      { id: 'a9', name: 'Sari Dewi', phone: '0812', email: '' },
    ])
    api.pilot.add.mockRejectedValue({
      response: { data: { code: 'MIKROTIK_ACCOUNT_NOT_FOUND', message: 'x' } },
    })
    const w = await mountPanel()
    await buttonByText(w, 'Tambah akun pilot')!.trigger('click')
    await w.find('input[type="search"]').setValue('sari')
    await vi.advanceTimersByTimeAsync(400)
    await flushPromises()
    await w
      .findAll('li button')
      .find((b) => b.text().includes('Sari Dewi'))!
      .trigger('click')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toContain('Pelanggan tidak ditemukan')
  })

  it('VALIDATION_ERROR pada uji isolir ditampilkan dalam bahasa Indonesia', async () => {
    api.pilot.startTest.mockRejectedValue({
      response: { data: { code: 'VALIDATION_ERROR', message: 'bad uuid' } },
    })
    const w = await mountPanel()
    await buttonByText(w, 'Uji Isolir')!.trigger('click')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toBe('Data tidak valid. Periksa isian lalu coba lagi.')
  })

  it('alur pemilih: cari, pilih, lalu pilot.add', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    api.accounts.search.mockResolvedValue([
      { id: 'a9', name: 'Sari Dewi', phone: '0812', email: '' },
    ])
    api.pilot.add.mockResolvedValue(undefined as never)
    const w = await mountPanel()
    await buttonByText(w, 'Tambah akun pilot')!.trigger('click')
    await w.find('input[type="search"]').setValue('sari')
    await vi.advanceTimersByTimeAsync(400)
    await flushPromises()
    expect(api.accounts.search).toHaveBeenCalledWith('sari')
    await w
      .findAll('li button')
      .find((b) => b.text().includes('Sari Dewi'))!
      .trigger('click')
    await flushPromises()
    expect(api.pilot.add).toHaveBeenCalledWith('a9')
  })

  it.each([
    ['MIKROTIK_PILOT_TEST_NOT_RUNNABLE', 'Akun ini tidak bisa diuji'],
    ['MIKROTIK_PILOT_MODE_REQUIRED', 'Uji isolir hanya bisa dijalankan saat mode Pilot.'],
  ])('menampilkan galat %s', async (code, text) => {
    api.pilot.startTest.mockRejectedValue({ response: { data: { code, message: 'x' } } })
    const w = await mountPanel()
    await buttonByText(w, 'Uji Isolir')!.trigger('click')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toContain(text)
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

  it('polling menyegarkan tugas, pilot, dan control; berhenti saat test_active false', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    api.pilot.list
      .mockResolvedValueOnce([pilotAccount({ test_active: true })])
      .mockResolvedValue([pilotAccount({ test_active: false, verified: true })])
    const w = await mountPanel()
    const tasksBefore = api.tasks.list.mock.calls.length
    await vi.advanceTimersByTimeAsync(3100)
    await flushPromises()
    expect(api.tasks.list.mock.calls.length).toBeGreaterThan(tasksBefore)
    expect(api.pilot.list).toHaveBeenCalledTimes(2)
    expect(w.text()).toContain('Terverifikasi')
    const settled = api.tasks.list.mock.calls.length
    await vi.advanceTimersByTimeAsync(10000)
    expect(api.tasks.list.mock.calls.length).toBe(settled)
    expect(api.pilot.list).toHaveBeenCalledTimes(2)
  })

  it('Lepas tetap berjalan saat engine off', async () => {
    api.pilot.remove.mockResolvedValue(undefined as never)
    const w = await mountPanel({ engine: 'off' })
    await buttonByText(w, 'Lepas')!.trigger('click')
    await flushPromises()
    expect(api.pilot.remove).toHaveBeenCalledWith('a1')
  })

  it('polling berlanjut setelah test_active false sampai terverifikasi, lalu berhenti', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const tested = pilotAccount({ test_active: false, test_until: '2026-11-02T03:10:00Z' })
    api.pilot.list
      .mockResolvedValueOnce([
        pilotAccount({ test_active: true, test_until: '2026-11-02T03:10:00Z' }),
      ])
      .mockResolvedValueOnce([tested])
      .mockResolvedValueOnce([tested])
      .mockResolvedValue([{ ...tested, verified: true }])
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const control = ref(controlState({ mode: 'pilot' }))
    const w = mount(PilotPanel, {
      attachTo: document.body,
      props: { control: control.value, canUpdate: true },
      global: { plugins: [[VueQueryPlugin, { queryClient }]] },
    })
    await flushPromises()
    await vi.advanceTimersByTimeAsync(3100) // test_active sudah false, belum terverifikasi
    await flushPromises()
    const afterEnd = api.pilot.list.mock.calls.length
    await vi.advanceTimersByTimeAsync(3100)
    await flushPromises()
    expect(api.pilot.list.mock.calls.length).toBeGreaterThan(afterEnd)
    // Backend menandai verifikasi: kontrol berubah, polling berhenti.
    await w.setProps({
      control: controlState({ mode: 'pilot', pilot_verified_at: '2026-11-02T03:12:00Z' }),
    })
    await vi.advanceTimersByTimeAsync(100)
    const settled = api.pilot.list.mock.calls.length
    await vi.advanceTimersByTimeAsync(10000)
    expect(api.pilot.list.mock.calls.length).toBe(settled)
  })

  it('polling berhenti setelah batas atas bila tak ada verifikasi', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    api.pilot.list.mockResolvedValue([
      pilotAccount({ test_active: false, test_until: '2026-11-02T03:10:00Z' }),
    ])
    await mountPanel()
    await vi.advanceTimersByTimeAsync(16 * 60 * 1000)
    const settled = api.tasks.list.mock.calls.length
    await vi.advanceTimersByTimeAsync(30000)
    expect(api.tasks.list.mock.calls.length).toBe(settled)
  })

  it('unmount menghentikan polling', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    api.pilot.list.mockResolvedValue([pilotAccount({ test_active: true })])
    const w = await mountPanel()
    w.unmount()
    const before = api.tasks.list.mock.calls.length
    await vi.advanceTimersByTimeAsync(10000)
    expect(api.tasks.list.mock.calls.length).toBe(before)
  })

  it('menandai akun terverifikasi', async () => {
    api.pilot.list.mockResolvedValue([pilotAccount({ verified: true })])
    const w = await mountPanel()
    expect(w.text()).toContain('Terverifikasi')
  })

  it('member melihat daftar tetapi kontrol aria-disabled dengan tooltip persis', async () => {
    const w = await mountPanel({}, false)
    expect(w.text()).toContain('Budi Santoso')
    for (const label of ['Uji Isolir', 'Tambah akun pilot', 'Lepas']) {
      const b = buttonByText(w, label)!
      expect(b.attributes('aria-disabled')).toBe('true')
      expect(b.attributes('title')).toBe(CONTROL_OWNER_ONLY_TOOLTIP)
      expect(describedText(w, b)).toBe(CONTROL_OWNER_ONLY_TOOLTIP)
    }
    await buttonByText(w, 'Uji Isolir')!.trigger('click')
    expect(api.pilot.startTest).not.toHaveBeenCalled()
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
