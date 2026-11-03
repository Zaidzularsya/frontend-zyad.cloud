import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: {
    control: { get: vi.fn(), previewSummary: vi.fn(), preview: vi.fn(), setMode: vi.fn() },
    pilot: { list: vi.fn() },
    tasks: { list: vi.fn() },
    policy: { set: vi.fn() },
  },
}))
vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn() }),
}))

import LaunchWizardPage from '@/features/mikrotik/pages/LaunchWizardPage.vue'
import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import { controlState, previewSummary } from '@/features/mikrotik/testing/fixtures'
import { CONTROL_OWNER_ONLY_TOOLTIP } from '@/features/mikrotik/utils/control-permissions'
import type { ControlState } from '@/features/mikrotik/types'
import { useAuthStore } from '@/stores/auth.store'
import type { Permission } from '@/types/auth'

const api = vi.mocked(mikrotikApi, true)
const OWNER = [
  'mikrotik_control.read',
  'mikrotik_control.update',
  'mikrotik_control.restore',
] as Permission[]
const MEMBER = ['mikrotik_control.read'] as Permission[]
const PILOT_MSG =
  'Selesaikan minimal satu uji pilot yang berhasil sebelum mengaktifkan isolir otomatis.'

async function mountPage(control: Partial<ControlState>, permissions: Permission[] = OWNER) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().$patch((s) => {
    ;(s as { user: unknown }).user = { id: 'u', name: 'A', email: 'a@x.test', permissions }
  })
  api.control.get.mockResolvedValue(controlState(control))
  const w = mount(LaunchWizardPage, {
    attachTo: document.body,
    global: {
      plugins: [
        pinia,
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
const btn = (w: ReturnType<typeof mount>, text: string) =>
  w.findAll('button').find((b) => b.text() === text)

describe('LaunchWizardPage', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    api.control.previewSummary.mockResolvedValue(previewSummary())
    api.control.preview.mockResolvedValue({ data: [], meta: { total: 0 } } as never)
    api.control.setMode.mockReset().mockResolvedValue(controlState() as never)
    api.pilot.list.mockResolvedValue([])
    api.tasks.list.mockResolvedValue({ data: [], meta: {} } as never)
  })

  it('mode simulation: banner, kandidat, dan Lanjut ke Pilot memanggil SetMode pilot', async () => {
    const w = await mountPage({ mode: 'simulation' })
    expect(w.text()).toContain('Simulasi, tidak ada koneksi yang diputus')
    expect(w.find('[data-testid="count-target"]').exists()).toBe(true)
    await btn(w, 'Lanjut ke Pilot')!.trigger('click')
    await flushPromises()
    expect(api.control.setMode).toHaveBeenCalledWith({ mode: 'pilot' })
  })

  it('mode pilot: panel pilot tampil dan Aktif nonaktif tanpa pilot_verified_at', async () => {
    const w = await mountPage({ mode: 'pilot' })
    expect(w.text()).toContain('Akun pilot')
    expect(w.find('[aria-current="step"]').text()).toContain('Pilot')
    expect(btn(w, 'Aktifkan Isolir Otomatis')!.attributes('disabled')).toBeDefined()
  })

  it('Aktif aktif setelah terverifikasi dan mengirim SetMode active', async () => {
    const w = await mountPage({ mode: 'pilot', pilot_verified_at: '2026-11-02T00:00:00Z' })
    const b = btn(w, 'Aktifkan Isolir Otomatis')!
    expect(b.attributes('disabled')).toBeUndefined()
    await b.trigger('click')
    await flushPromises()
    expect(api.control.setMode).toHaveBeenCalledWith({ mode: 'active' })
  })

  it('menampilkan pesan persis bila backend membalas MIKROTIK_PILOT_REQUIRED', async () => {
    api.control.setMode.mockRejectedValue({
      response: { data: { code: 'MIKROTIK_PILOT_REQUIRED', message: 'raw' } },
    })
    const w = await mountPage({ mode: 'pilot', pilot_verified_at: '2026-11-02T00:00:00Z' })
    await btn(w, 'Aktifkan Isolir Otomatis')!.trigger('click')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toBe(PILOT_MSG)
  })

  it('engine off: banner dan aksi pilot/aktif nonaktif', async () => {
    const w = await mountPage({
      mode: 'pilot',
      engine: 'off',
      pilot_verified_at: '2026-11-02T00:00:00Z',
    })
    expect(w.text()).toContain('Mesin isolir dinonaktifkan operator')
    expect(btn(w, 'Aktifkan Isolir Otomatis')!.attributes('disabled')).toBeDefined()
    expect(btn(w, 'Uji Isolir')).toBeUndefined()
  })

  it('mode active: langkah Aktif tanpa tombol aktivasi', async () => {
    const w = await mountPage({ mode: 'active' })
    expect(w.find('[aria-current="step"]').text()).toContain('Aktif')
    expect(btn(w, 'Aktifkan Isolir Otomatis')).toBeUndefined()
  })

  it('member melihat semuanya tetapi kontrol nonaktif dengan tooltip persis', async () => {
    const w = await mountPage({ mode: 'simulation' }, MEMBER)
    const b = btn(w, 'Lanjut ke Pilot')!
    expect(b.attributes('disabled')).toBeDefined()
    expect(b.attributes('title')).toBe(CONTROL_OWNER_ONLY_TOOLTIP)
    expect(w.find('[data-testid="count-target"]').exists()).toBe(true)
    expect(api.control.setMode).not.toHaveBeenCalled()
  })

  it('member di mode pilot: Aktifkan nonaktif dengan tooltip persis', async () => {
    const w = await mountPage({ mode: 'pilot', pilot_verified_at: '2026-11-02T00:00:00Z' }, MEMBER)
    const b = btn(w, 'Aktifkan Isolir Otomatis')!
    expect(b.attributes('disabled')).toBeDefined()
    expect(b.attributes('title')).toBe(CONTROL_OWNER_ONLY_TOOLTIP)
  })
})
