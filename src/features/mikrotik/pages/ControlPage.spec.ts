import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

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
    tasks: { summary: vi.fn() },
    policy: { set: vi.fn() },
  },
}))
vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn() }),
}))

import ControlPage from '@/features/mikrotik/pages/ControlPage.vue'
import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import { controlState, previewItem, previewSummary } from '@/features/mikrotik/testing/fixtures'
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

async function mountPage(control: Partial<ControlState>, permissions: Permission[] = OWNER) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().$patch((s) => {
    ;(s as { user: unknown }).user = { id: 'u', name: 'A', email: 'a@x.test', permissions }
  })
  api.control.get.mockResolvedValue(controlState(control))
  const w = mount(ControlPage, {
    attachTo: document.body,
    global: {
      plugins: [
        pinia,
        [
          VueQueryPlugin,
          { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        ],
      ],
      stubs: { RouterLink: { template: '<a><slot /></a>' } },
    },
  })
  await flushPromises()
  return w
}
const btn = (text: string) =>
  [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === text) as
    | HTMLButtonElement
    | undefined
const click = async (el: Element | undefined) => {
  el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await flushPromises()
}
const setValue = async (sel: string, value: string) => {
  const el = document.body.querySelector(sel) as HTMLInputElement
  el.value = value
  el.dispatchEvent(new Event('input'))
  await flushPromises()
}

describe('ControlPage', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    Object.values(api.control).forEach((f) => f.mockReset())
    api.control.previewSummary.mockResolvedValue(previewSummary({ target: 4 }))
    api.control.preview.mockResolvedValue({
      data: [
        previewItem({ account_id: 'a1' }),
        previewItem({ account_id: 'a2', account_name: 'Siti' }),
      ],
      meta: { total: 2 },
    } as never)
    api.control.setMode.mockResolvedValue(controlState() as never)
    api.control.activity.mockResolvedValue({
      data: [
        {
          id: 'e1',
          at: '2026-11-02T01:00:00Z',
          event: 'isolation.isolated',
          actor_user_id: '',
          account_id: 'a1',
          account_name: 'Budi',
          secret_name: 'budi',
          message: '3 pelanggan diisolir, 1 gagal: secret tidak ditemukan',
        },
      ],
      meta: { total: 1, limit: 20, offset: 0 },
    } as never)
    api.tasks.summary.mockResolvedValue({
      counts: { failed: 2 },
      oldest_pending_restore_at: null,
    } as never)
  })

  it('Pulihkan Semua nonaktif saat mode active, dengan alasan yang terbaca', async () => {
    await mountPage({ mode: 'active' })
    const b = btn('Pulihkan Semua')!
    expect(b.getAttribute('aria-disabled')).toBe('true')
    const id = b.getAttribute('aria-describedby')!
    expect(document.getElementById(id)?.textContent).toContain('dijeda')
    await click(b)
    expect(document.body.textContent).not.toContain('Pulihkan Semua Pelanggan?')
  })

  it('Pulihkan Semua nonaktif saat mesin mati walau paused', async () => {
    await mountPage({ mode: 'paused', engine: 'off' })
    expect(btn('Pulihkan Semua')!.getAttribute('aria-disabled')).toBe('true')
  })

  it('paused: banner, konfirmasi, lalu tampilkan enqueued/skipped', async () => {
    api.control.restoreAll.mockResolvedValue({
      enqueued: 5,
      skipped: 2,
      failed: 0,
      aborted: false,
    })
    await mountPage({ mode: 'paused' })
    expect(document.body.textContent).toContain(
      'Isolir otomatis dihentikan. Namun, pemulihan otomatis (Restore) untuk pelanggan yang membayar tetap berjalan.',
    )
    const b = btn('Pulihkan Semua')!
    expect(b.getAttribute('aria-disabled')).toBeNull()
    await click(b)
    expect(api.control.restoreAll).not.toHaveBeenCalled()
    await click(
      [...document.body.querySelectorAll('button')]
        .filter((x) => x.textContent?.trim() === 'Pulihkan Semua')
        .at(-1),
    )
    expect(api.control.restoreAll).toHaveBeenCalledTimes(1)
    const r = document.body.querySelector('[data-testid=restore-result]')!.textContent!
    expect(r).toContain('5 diproses')
    expect(r).toContain('2 dilewati')
  })

  it('menampilkan galat terpetakan bila restore-all ditolak 409', async () => {
    api.control.restoreAll.mockRejectedValue({
      response: { data: { code: 'MIKROTIK_NOT_PAUSED', message: 'x' } },
    })
    await mountPage({ mode: 'paused' })
    await click(btn('Pulihkan Semua'))
    await click(
      [...document.body.querySelectorAll('button')]
        .filter((x) => x.textContent?.trim() === 'Pulihkan Semua')
        .at(-1),
    )
    expect(document.body.textContent).toContain('hanya bisa dipakai saat mode dijeda')
  })

  it('PAUSE mengirim mode paused', async () => {
    await mountPage({ mode: 'active' })
    await click(document.body.querySelector('[role=switch]')!)
    expect(api.control.setMode).toHaveBeenCalledWith({ mode: 'paused' })
  })

  it('ON dari paused membuka dialog reaktivasi dengan ringkasan', async () => {
    await mountPage({ mode: 'paused' })
    await click(document.body.querySelector('[role=switch]')!)
    expect(document.body.querySelector('[data-testid=reactivate-summary]')!.textContent).toContain(
      '4 pelanggan akan diisolir ulang dalam 2 menit',
    )
  })

  it('dialog reaktivasi: tolak alasan kosong, kirim payload persis', async () => {
    await mountPage({ mode: 'paused' })
    await click(document.body.querySelector('[role=switch]')!)
    const boxes = document.body.querySelectorAll<HTMLInputElement>('input[type=checkbox]')
    await click(boxes[0])
    await click(boxes[1])
    const submit = btn('Aktifkan & Beri Pengecualian pada 2 Pelanggan Terpilih')!
    await click(submit)
    expect(api.control.setMode).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Alasan wajib diisi.')
    expect(document.body.textContent).toContain('Tanggal wajib diisi.')
    await setValue('#reactivate-until', '2099-12-31')
    await setValue('#reactivate-reason', '  Menunggu gajian  ')
    await click(submit)
    expect(api.control.setMode).toHaveBeenCalledWith({
      mode: 'active',
      exemptions: { account_ids: ['a1', 'a2'], reason: 'Menunggu gajian', until: '2099-12-31' },
    })
  })

  it('tanpa pilihan, aktifkan tanpa pengecualian', async () => {
    await mountPage({ mode: 'paused' })
    await click(document.body.querySelector('[role=switch]')!)
    await click(btn('Aktifkan Tanpa Pengecualian'))
    expect(api.control.setMode).toHaveBeenCalledWith({ mode: 'active' })
  })

  it('GraceDaysCard menolak di luar 0..60 dan menyimpan yang valid', async () => {
    api.control.setGraceDays.mockResolvedValue(controlState() as never)
    await mountPage({ mode: 'active' })
    await setValue('#grace-days', '61')
    await click(btn('Simpan'))
    expect(api.control.setGraceDays).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('antara 0 dan 60')
    await setValue('#grace-days', '-1')
    await click(btn('Simpan'))
    expect(api.control.setGraceDays).not.toHaveBeenCalled()
    await setValue('#grace-days', '7')
    await click(btn('Simpan'))
    expect(api.control.setGraceDays).toHaveBeenCalledWith(7)
  })

  it('menampilkan log aktivitas, kartu angka, dan banner merah', async () => {
    api.tasks.summary.mockResolvedValue({
      counts: { failed: 2 },
      oldest_pending_restore_at: new Date(Date.now() - 5 * 60_000).toISOString(),
    } as never)
    await mountPage({ mode: 'active', isolated_secrets: 9 })
    expect(document.body.textContent).toContain(
      '3 pelanggan diisolir, 1 gagal: secret tidak ditemukan',
    )
    expect(document.body.querySelector('[data-testid=count-isolated]')!.textContent).toContain('9')
    expect(document.body.querySelector('[data-testid=count-failed]')!.textContent).toContain('2')
    expect(document.body.querySelector('[role=alert]')!.textContent).toContain(
      'sudah bayar tapi belum dibuka',
    )
  })

  it('member: semua kontrol nonaktif dengan tooltip persis dan tanpa mutasi', async () => {
    await mountPage({ mode: 'paused' }, MEMBER)
    const sw = document.body.querySelector('[role=switch]')!
    expect(sw.getAttribute('aria-disabled')).toBe('true')
    expect(sw.getAttribute('title')).toBe(CONTROL_OWNER_ONLY_TOOLTIP)
    expect(document.getElementById(sw.getAttribute('aria-describedby')!)?.textContent).toBe(
      CONTROL_OWNER_ONLY_TOOLTIP,
    )
    const restore = btn('Pulihkan Semua')!
    expect(restore.getAttribute('aria-disabled')).toBe('true')
    expect(restore.getAttribute('title')).toBe(CONTROL_OWNER_ONLY_TOOLTIP)
    await click(sw)
    await click(restore)
    await setValue('#grace-days', '5')
    await click(btn('Simpan'))
    expect(api.control.setMode).not.toHaveBeenCalled()
    expect(api.control.restoreAll).not.toHaveBeenCalled()
    expect(api.control.setGraceDays).not.toHaveBeenCalled()
    expect(document.body.textContent).not.toContain('Aktifkan Tanpa Pengecualian')
  })

  it('mode simulation/pilot mengarahkan ke wizard', async () => {
    await mountPage({ mode: 'pilot' })
    expect(document.body.textContent).toContain('Isolir otomatis belum diaktifkan')
    expect(document.body.querySelector('[role=switch]')).toBeNull()
  })
})
