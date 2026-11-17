import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const balance = vi.hoisted(() => vi.fn())
const entries = vi.hoisted(() => vi.fn())
vi.mock('@/features/settlement/api/settlement.api', () => ({
  settlementApi: { own: { balance, entries } },
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/app/billing/settlement' }),
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}))

import MyBalancePage from './MyBalancePage.vue'

const meta = { page: 1, per_page: 20, total: 2, total_pages: 1 }

async function mountPage() {
  const w = mount(MyBalancePage, {
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

describe('MyBalancePage', () => {
  beforeEach(() => {
    balance.mockResolvedValue({
      paid_in: '2000000.00',
      settled: '750000.00',
      adjusted: '0.00',
      balance: '1250000.00',
    })
  })

  it('shows the four cards and the explanation', async () => {
    entries.mockResolvedValue({ data: [], meta: { ...meta, total: 0 } })
    const w = await mountPage()
    const text = w.text()
    expect(text).toContain('Masuk')
    expect(text).toContain('Rp 2.000.000')
    expect(text).toContain('Disetor')
    expect(text).toContain('Rp 750.000')
    expect(text).toContain('Penyesuaian')
    expect(text).toContain('Sisa')
    expect(text).toContain('Rp 1.250.000')
    expect(text).toContain('Pembayaran online masuk ke rekening Zyad dan disetorkan manual')
  })

  it('lists entries with type badge, amount, note and invoice reference', async () => {
    entries.mockResolvedValue({
      data: [
        {
          id: 'e1',
          organization_id: 'o',
          kind: 'payment',
          amount: '1000000.00',
          invoice_id: 'inv-9',
          provider_reference: 'DOKU-123',
          note: '',
          occurred_at: '2026-10-20T03:00:00Z',
          created_at: '2026-10-20T03:00:00Z',
        },
        {
          id: 'e2',
          organization_id: 'o',
          kind: 'settlement',
          amount: '750000.00',
          note: 'Setoran Okt',
          occurred_at: '2026-10-22T03:00:00Z',
          created_at: '2026-10-22T03:00:00Z',
        },
      ],
      meta,
    })
    const w = await mountPage()
    const text = w.text()
    expect(text).toContain('Pembayaran')
    expect(text).toContain('Setoran')
    expect(text).toContain('Setoran Okt')
    expect(text).toContain('DOKU-123')
    expect(w.find('a').exists()).toBe(true)
  })

  it('shows an empty state', async () => {
    entries.mockResolvedValue({ data: [], meta: { ...meta, total: 0 } })
    const w = await mountPage()
    expect(w.text()).toContain('Belum ada transaksi')
  })
})
