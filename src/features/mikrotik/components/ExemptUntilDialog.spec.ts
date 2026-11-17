import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: { policy: { set: vi.fn() } },
}))

import ExemptUntilDialog from '@/features/mikrotik/components/ExemptUntilDialog.vue'
import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import { wibToday } from '@/features/mikrotik/utils/preview'

async function mountDialog(extra: Record<string, unknown> = {}) {
  const w = mount(ExemptUntilDialog, {
    attachTo: document.body,
    props: { open: true, accountId: 'a1', accountName: 'Budi', ...extra },
    global: { plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]] },
  })
  await flushPromises()
  return w
}

async function fill(sel: string, value: string) {
  const el = document.body.querySelector(sel) as HTMLInputElement
  el.value = value
  el.dispatchEvent(new Event('input'))
  await flushPromises()
}
const submit = async () => {
  ;(document.body.querySelector('button[type=submit]') as HTMLButtonElement).click()
  await flushPromises()
}

describe('ExemptUntilDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.mocked(mikrotikApi.policy.set)
      .mockReset()
      .mockResolvedValue({} as never)
  })

  it('mengirim exempt, alasan, dan tanggal inklusif, lalu menutup', async () => {
    const w = await mountDialog({ requireDate: true })
    await fill('input[name=exempted_until]', '2099-01-31')
    await fill('textarea[name=reason]', '  Menunggu transfer  ')
    await submit()
    expect(mikrotikApi.policy.set).toHaveBeenCalledWith('a1', {
      exempt: true,
      reason: 'Menunggu transfer',
      exempted_until: '2099-01-31',
    })
    expect(w.emitted('saved')).toBeTruthy()
    expect(w.emitted('close')).toBeTruthy()
  })

  it('batas min tanggal adalah hari ini WIB dan tanggal lampau ditolak', async () => {
    await mountDialog()
    const input = document.body.querySelector('input[name=exempted_until]') as HTMLInputElement
    expect(input.min).toBe(wibToday())
    await fill('input[name=exempted_until]', '2000-01-01')
    await fill('textarea[name=reason]', 'x')
    await submit()
    expect(mikrotikApi.policy.set).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Tanggal tidak boleh sebelum hari ini')
  })

  it('tanpa requireDate tanggal opsional dan tidak dikirim bila kosong', async () => {
    await mountDialog()
    await fill('textarea[name=reason]', 'Kelonggaran')
    await submit()
    expect(mikrotikApi.policy.set).toHaveBeenCalledWith('a1', {
      exempt: true,
      reason: 'Kelonggaran',
    })
  })

  it('galat tanggal hilang setelah pengguna mengubah isian', async () => {
    await mountDialog({ requireDate: true })
    await submit()
    expect(document.body.textContent).toContain('Tanggal wajib diisi.')
    await fill('input[name=exempted_until]', '2099-01-31')
    expect(document.body.textContent).not.toContain('Tanggal wajib diisi.')
  })

  it('menolak tanggal kosong dan alasan kosong', async () => {
    await mountDialog({ requireDate: true })
    await submit()
    expect(mikrotikApi.policy.set).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Tanggal wajib diisi.')
    expect(document.body.textContent).toContain('Alasan wajib diisi.')
  })

  it('menolak alasan lebih dari 500 karakter', async () => {
    await mountDialog()
    await fill('input[name=exempted_until]', '2099-01-31')
    await fill('textarea[name=reason]', 'a'.repeat(501))
    await submit()
    expect(mikrotikApi.policy.set).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Maksimal 500 karakter')
  })

  it('menampilkan galat server dan tetap terbuka', async () => {
    vi.mocked(mikrotikApi.policy.set).mockRejectedValue({
      response: { data: { code: 'VALIDATION_ERROR' } },
    })
    const w = await mountDialog()
    await fill('input[name=exempted_until]', '2099-01-31')
    await fill('textarea[name=reason]', 'x')
    await submit()
    expect(document.body.textContent).toContain('Data tidak valid')
    expect(w.emitted('close')).toBeFalsy()
  })
})
