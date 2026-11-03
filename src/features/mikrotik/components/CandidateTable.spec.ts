import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: {
    control: { preview: vi.fn(), exportPreview: vi.fn() },
    policy: { set: vi.fn() },
  },
}))
const toastError = vi.hoisted(() => vi.fn())
vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ error: toastError, success: vi.fn() }),
}))

import CandidateTable from '@/features/mikrotik/components/CandidateTable.vue'
import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import { previewItem, previewSummary } from '@/features/mikrotik/testing/fixtures'
import { CONTROL_OWNER_ONLY_TOOLTIP } from '@/features/mikrotik/utils/control-permissions'

const preview = vi.mocked(mikrotikApi.control.preview)

function setRows(rows: ReturnType<typeof previewItem>[], total = rows.length) {
  preview.mockResolvedValue({
    data: rows,
    meta: { page: 1, per_page: 20, total, total_pages: 1 },
  } as never)
}

async function mountTable(canUpdate = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const w = mount(CandidateTable, {
    attachTo: document.body,
    props: { summary: previewSummary(), canUpdate },
    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
  })
  await flushPromises()
  return w
}

describe('CandidateTable', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    preview.mockReset()
    toastError.mockReset()
    vi.mocked(mikrotikApi.policy.set)
      .mockReset()
      .mockResolvedValue({} as never)
    vi.mocked(mikrotikApi.control.exportPreview).mockReset()
  })

  it('menampilkan empat kolom spec dan dua angka besar', async () => {
    setRows([
      previewItem(),
      previewItem({
        account_id: 'a2',
        account_name: 'Sari',
        status: 'exempt',
        exempted_until: '2026-11-12',
      }),
    ])
    const w = await mountTable()
    const heads = w.findAll('th').map((h) => h.text())
    expect(heads).toEqual(
      expect.arrayContaining([
        'Pelanggan & Paket',
        'Alasan Isolir',
        'Status Secret di Router',
        'Status Pengecualian',
      ]),
    )
    const [first, second] = w.findAll('tbody tr')
    expect(first!.text()).toContain('Budi Santoso')
    expect(first!.text()).toContain('Paket 20 Mbps')
    expect(first!.text()).toContain('Tunggakan 15 hari')
    expect(first!.text()).toContain('INV-001')
    expect(first!.text()).toContain('Siap diisolir')
    expect(second!.text()).toContain('Dikecualikan sampai 12 Nov 2026')
    expect(w.get('[data-testid=count-target]').text()).toBe('12')
    expect(w.get('[data-testid=count-safe]').text()).toBe('15')
    expect(w.text()).toContain('Target Isolir')
    expect(w.text()).toContain('Aman/Dikecualikan')
  })

  it('baris terblokir merah dengan aksi nonaktif dan tooltip persis', async () => {
    setRows([previewItem({ status: 'secret_missing' })])
    const w = await mountTable()
    const row = w.get('tbody tr')
    expect(row.classes().join(' ')).toContain('bg-red')
    const btn = row.get('button')
    expect(btn.attributes('aria-disabled')).toBe('true')
    const hint = w.get(`#${btn.attributes('aria-describedby')}`)
    expect(hint.text()).toBe(btn.attributes('title'))
    expect(btn.attributes('title')).toBe(
      'Tidak bisa diisolir. Secret tidak ditemukan di router. Perbaiki pemetaan di Akun PPPoE.',
    )
  })

  it('member: aksi nonaktif dengan tooltip izin persis', async () => {
    setRows([previewItem()])
    const w = await mountTable(false)
    const btn = w.get('tbody tr button')
    expect(btn.attributes('aria-disabled')).toBe('true')
    expect(w.get(`#${btn.attributes('aria-describedby')}`).text()).toBe(CONTROL_OWNER_ONLY_TOOLTIP)
    await btn.trigger('click')
    expect(document.body.querySelector('[role=dialog]')).toBeNull()
    expect(btn.attributes('title')).toBe(CONTROL_OWNER_ONLY_TOOLTIP)
    expect(btn.attributes('title')).toBe(
      'Hanya Pemilik Organisasi yang dapat mengubah pengaturan ini.',
    )
  })

  it('filter status dan halaman diteruskan ke API', async () => {
    setRows([previewItem()])
    const w = await mountTable()
    expect(preview).toHaveBeenLastCalledWith({ page: 1, per_page: 20 })
    await w.get('select[name=status]').setValue('exempt')
    await flushPromises()
    expect(preview).toHaveBeenLastCalledWith({ status: 'exempt', page: 1, per_page: 20 })
  })

  it('pencarian memakai debounce lalu mengirim q', async () => {
    vi.useFakeTimers()
    setRows([previewItem()])
    const w = await mountTable()
    await w.get('input[name=q]').setValue(' budi ')
    await vi.advanceTimersByTimeAsync(350)
    await flushPromises()
    expect(preview).toHaveBeenLastCalledWith({ q: 'budi', page: 1, per_page: 20 })
    vi.useRealTimers()
  })

  it('Kecualikan membuka dialog, menyimpan, dan memancarkan exempted', async () => {
    setRows([previewItem()])
    const w = await mountTable()
    await w.get('tbody tr button').trigger('click')
    await flushPromises()
    const date = document.body.querySelector('input[name=exempted_until]') as HTMLInputElement
    date.value = '2099-01-31'
    date.dispatchEvent(new Event('input'))
    const reason = document.body.querySelector('textarea[name=reason]') as HTMLTextAreaElement
    reason.value = 'VIP'
    reason.dispatchEvent(new Event('input'))
    ;(document.body.querySelector('button[type=submit]') as HTMLButtonElement).click()
    await flushPromises()
    expect(mikrotikApi.policy.set).toHaveBeenCalledWith('a1', {
      exempt: true,
      reason: 'VIP',
      exempted_until: '2099-01-31',
    })
    expect(w.emitted('exempted')?.[0]).toEqual(['a1'])
    // Invalidasi menyegarkan daftar (query ulang).
    expect(preview.mock.calls.length).toBeGreaterThan(1)
  })

  it('Ekspor CSV mengunduh blob lewat klien http dengan filter aktif', async () => {
    setRows([previewItem()])
    const blob = new Blob(['x'])
    vi.mocked(mikrotikApi.control.exportPreview).mockResolvedValue(blob)
    const create = vi.fn().mockReturnValue('blob:csv')
    const revoke = vi.fn()
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const w = await mountTable()
    vi.useFakeTimers()
    await w.get('select[name=status]').setValue('will_isolate')
    await flushPromises()
    const btn = w.findAll('button').find((b) => b.text() === 'Ekspor CSV')!
    await btn.trigger('click')
    await flushPromises()
    expect(mikrotikApi.control.exportPreview).toHaveBeenCalledWith({ status: 'will_isolate' })
    expect(create).toHaveBeenCalledWith(blob)
    expect(click).toHaveBeenCalled()
    vi.runAllTimers()
    expect(revoke).toHaveBeenCalledWith('blob:csv')
    expect(w.find('a[href]').exists()).toBe(false)
    click.mockRestore()
    vi.useRealTimers()
  })

  it('galat ekspor ditampilkan lewat pemetaan galat yang ada', async () => {
    setRows([previewItem()])
    vi.mocked(mikrotikApi.control.exportPreview).mockRejectedValue({
      response: { data: { code: 'INTERNAL_ERROR' } },
    })
    const w = await mountTable()
    await w
      .findAll('button')
      .find((b) => b.text() === 'Ekspor CSV')!
      .trigger('click')
    await flushPromises()
    expect(toastError).toHaveBeenCalledWith('Terjadi kesalahan di server. Coba lagi nanti.')
  })

  it('pengecualian lewat tanggal tampil "berakhir" dengan aksi Kecualikan', async () => {
    setRows([previewItem({ status: 'will_isolate', exempted_until: '2020-01-01' })])
    const w = await mountTable()
    const row = w.get('tbody tr')
    expect(row.text()).toContain('Pengecualian berakhir 1 Jan 2020')
    expect(row.text()).not.toContain('Dikecualikan sampai')
    expect(row.get('button').text()).toBe('Kecualikan')
  })

  it('mundur ke halaman terakhir bila halaman lewat ujung daftar', async () => {
    preview.mockImplementation(async (p) =>
      (p?.page ?? 1) > 1
        ? ({ data: [], meta: { page: 2, per_page: 20, total: 5, total_pages: 1 } } as never)
        : ({
            data: [previewItem()],
            meta: { page: 1, per_page: 20, total: 5, total_pages: 1 },
          } as never),
    )
    const w = await mountTable()
    // Paksa halaman 2 lewat tombol paginasi sudah tidak ada (1 halaman); ubah lewat filter ulang.
    const vm = w.vm as unknown as { $: { setupState: { page: number } } }
    vm.$.setupState.page = 2
    await flushPromises()
    expect(preview).toHaveBeenLastCalledWith({ page: 1, per_page: 20 })
    expect(w.text()).toContain('Budi Santoso')
  })

  it('galat ekspor berbadan Blob JSON dipetakan lewat kodenya', async () => {
    setRows([previewItem()])
    vi.mocked(mikrotikApi.control.exportPreview).mockRejectedValue({
      response: { data: new Blob([JSON.stringify({ code: 'INTERNAL_ERROR' })]) },
    })
    const w = await mountTable()
    await w
      .findAll('button')
      .find((b) => b.text() === 'Ekspor CSV')!
      .trigger('click')
    await flushPromises()
    await vi.waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('Terjadi kesalahan di server. Coba lagi nanti.'),
    )
  })

  it('menampilkan keadaan kosong dan galat muat', async () => {
    setRows([])
    const w = await mountTable()
    expect(w.text()).toContain('Tidak ada pelanggan yang cocok')
    preview.mockRejectedValue(new Error('x'))
    const w2 = await mountTable()
    expect(w2.text()).toContain('Gagal memuat daftar kandidat.')
  })
})
