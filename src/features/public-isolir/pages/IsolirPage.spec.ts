import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

import type { IsolirInfo, IsolirLookup } from '../types'

const { info, lookup } = vi.hoisted(() => ({ info: vi.fn(), lookup: vi.fn() }))
vi.mock('../api/isolir.api', () => ({ isolirApi: { info, lookup } }))

import IsolirPage from './IsolirPage.vue'

const enabledInfo = (phone = '0812-3456-7890'): IsolirInfo => ({
  enabled: true,
  tenant: { name: 'NetKita', phone, email: 'cs@netkita.id' },
})

const result = (over: Partial<IsolirLookup> = {}): IsolirLookup => ({
  found: true,
  masked_name: 'B*** S****',
  isolated: true,
  invoices: [
    {
      number: 'INV-1',
      due_date: '2026-10-12',
      balance: '233000.00',
      pay_url: 'https://pay.test/1',
    },
  ],
  ...over,
})

async function mountPage() {
  const w = mount(IsolirPage, {
    attachTo: document.body,
    global: {
      plugins: [
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

async function submit(w: Awaited<ReturnType<typeof mountPage>>, value = 'budi01') {
  await w.find('input').setValue(value)
  await w.find('form').trigger('submit')
  await flushPromises()
}

describe('IsolirPage', () => {
  beforeEach(() => {
    info.mockReset()
    lookup.mockReset()
    document.body.innerHTML = ''
  })

  it('renders neutral page when info.enabled is false', async () => {
    info.mockResolvedValue({ enabled: false })
    const w = await mountPage()
    expect(w.text()).toContain('Halaman ini tidak tersedia.')
    expect(w.find('input').exists()).toBe(false)
    expect(w.text()).not.toContain('NetKita')
  })

  it('shows isolated banner and pay buttons for invoices', async () => {
    info.mockResolvedValue(enabledInfo())
    lookup.mockResolvedValue(result())
    const w = await mountPage()
    expect(w.text()).toContain('NetKita')
    await submit(w)
    const text = w.text()
    expect(text).toContain('Internet Anda dijeda sementara karena ada tagihan yang belum dibayar.')
    expect(text).toContain('INV-1')
    expect(text).toContain('Rp 233.000')
    expect(text).toContain('12 Oktober 2026')
    const pay = w.findAll('a').find((a) => a.text().includes('Bayar'))
    expect(pay?.attributes('href')).toBe('https://pay.test/1')
  })

  it('shows non-isolated banner when isolated=false', async () => {
    info.mockResolvedValue(enabledInfo())
    lookup.mockResolvedValue(result({ isolated: false }))
    const w = await mountPage()
    await submit(w)
    expect(w.text()).toContain('Anda memiliki tagihan yang belum dibayar.')
    expect(w.text()).not.toContain('Internet Anda dijeda')
  })

  it('found=false shows uniform message and contact block', async () => {
    info.mockResolvedValue(enabledInfo())
    lookup.mockResolvedValue({ found: false, masked_name: '', isolated: false, invoices: [] })
    const w = await mountPage()
    await submit(w)
    expect(w.text()).toContain(
      'Tidak ada tagihan menunggak untuk data ini. Jika internet Anda mati, hubungi kami.',
    )
    expect(w.find('a[href^="tel:"]').exists()).toBe(true)
    expect(w.find('a[href^="mailto:cs@netkita.id"]').exists()).toBe(true)
  })

  it('hides pay button and shows CS text when pay_url empty', async () => {
    info.mockResolvedValue(enabledInfo())
    lookup.mockResolvedValue(
      result({
        invoices: [{ number: 'INV-2', due_date: '2026-10-12', balance: '1000.00', pay_url: '' }],
      }),
    )
    const w = await mountPage()
    await submit(w)
    expect(w.findAll('a').some((a) => a.text().includes('Bayar'))).toBe(false)
    expect(w.text()).toContain('Hubungi kami untuk membayar tagihan ini.')
  })

  it('wa.me link normalizes 0812… to 62812…', async () => {
    info.mockResolvedValue(enabledInfo('0812-3456-7890'))
    const w = await mountPage()
    expect(w.find('a[href^="https://wa.me/"]').attributes('href')).toBe(
      'https://wa.me/6281234567890',
    )
  })

  it('submit trims input and disables button while pending', async () => {
    info.mockResolvedValue(enabledInfo())
    let resolve!: (v: IsolirLookup) => void
    lookup.mockReturnValue(new Promise<IsolirLookup>((r) => (resolve = r)))
    const w = await mountPage()
    await w.find('input').setValue('  budi01  ')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(lookup).toHaveBeenCalledWith('budi01')
    expect(w.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    resolve(result())
    await flushPromises()
    expect(w.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('handles 429 message', async () => {
    info.mockResolvedValue(enabledInfo())
    lookup.mockRejectedValue({ response: { status: 429, data: { code: 'RATE_LIMITED' } } })
    const w = await mountPage()
    await submit(w)
    expect(w.text()).toContain('Terlalu banyak percobaan, coba lagi sebentar.')
  })

  it('shows generic retry message on other errors', async () => {
    info.mockResolvedValue(enabledInfo())
    lookup.mockRejectedValue({ response: { status: 500 } })
    const w = await mountPage()
    await submit(w)
    expect(w.text()).toContain('Terjadi kendala. Silakan coba lagi.')
  })

  it('does not render phone or email of customer', async () => {
    info.mockResolvedValue(enabledInfo())
    lookup.mockResolvedValue(result())
    const w = await mountPage()
    await submit(w)
    expect(w.text()).toContain('B*** S****')
    expect(w.text()).not.toMatch(/@.*(gmail|yahoo)/)
  })
})
