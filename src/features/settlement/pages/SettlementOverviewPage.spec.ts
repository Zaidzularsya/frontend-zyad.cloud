import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const list = vi.hoisted(() => vi.fn())
const entries = vi.hoisted(() => vi.fn())
const record = vi.hoisted(() => vi.fn())
vi.mock('@/features/settlement/api/settlement.api', () => ({
  settlementApi: { platform: { list, entries, record } },
}))

import SettlementOverviewPage from './SettlementOverviewPage.vue'

const org = {
  organization_id: 'org-1',
  organization_name: 'PT Maju Jaya',
  paid_in: '1500000.00',
  settled: '500000.00',
  adjusted: '0.00',
  balance: '1000000.00',
}
const meta = { page: 1, per_page: 20, total: 1, total_pages: 1 }

let wrapper: VueWrapper
const body = () => document.body

async function mountPage() {
  wrapper = mount(SettlementOverviewPage, {
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
}

async function openDetail() {
  await wrapper.find('[data-testid="open-org-1"]').trigger('click')
  await flushPromises()
}

function setField(name: string, value: string) {
  const el = body().querySelector<HTMLInputElement>(`[name="${name}"]`)!
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

function click(testId: string) {
  body().querySelector<HTMLElement>(`[data-testid="${testId}"]`)!.click()
}

describe('SettlementOverviewPage', () => {
  beforeEach(() => {
    list.mockResolvedValue({ data: [org], meta })
    entries.mockResolvedValue({
      data: [
        {
          id: 'e1',
          organization_id: 'org-1',
          kind: 'settlement',
          amount: '500000.00',
          note: 'Transfer Okt',
          occurred_at: '2026-10-20T00:00:00Z',
          created_at: '2026-10-20T00:00:00Z',
        },
      ],
      meta,
    })
    record.mockReset()
  })
  afterEach(() => {
    wrapper.unmount()
    document.body.innerHTML = ''
  })

  it('renders balances as formatted money', async () => {
    await mountPage()
    const text = wrapper.text()
    expect(text).toContain('PT Maju Jaya')
    expect(text).toContain('Rp 1.500.000')
    expect(text).toContain('Rp 500.000')
    expect(text).toContain('Rp 1.000.000')
  })

  it('searches by organization name', async () => {
    await mountPage()
    await wrapper.find('input[type="search"]').setValue('maju')
    await flushPromises()
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'maju', page: 1 }))
  })

  it('lists entries in the detail drawer', async () => {
    await mountPage()
    await openDetail()
    expect(entries).toHaveBeenCalledWith('org-1', expect.objectContaining({ page: 1 }))
    expect(body().textContent).toContain('Transfer Okt')
  })

  it('asks for confirmation with org name and amount before posting a setoran', async () => {
    record.mockResolvedValue({})
    await mountPage()
    await openDetail()
    setField('amount', '250000')
    click('submit-entry')
    await flushPromises()
    expect(record).not.toHaveBeenCalled()
    const confirm = body().querySelector('[role="dialog"][aria-label="Konfirmasi setoran"]')!
    expect(confirm.textContent).toContain('PT Maju Jaya')
    expect(confirm.textContent).toContain('Rp 250.000')

    click('confirm-entry')
    await flushPromises()
    expect(record).toHaveBeenCalledTimes(1)
    const [orgId, payload] = record.mock.calls[0]!
    expect(orgId).toBe('org-1')
    expect(payload).toEqual({
      kind: 'settlement',
      amount: '250000.00',
      note: '',
      occurred_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T00:00:00\+07:00$/),
    })
  })

  it('shows the Indonesian error when setoran exceeds balance', async () => {
    record.mockRejectedValue({ response: { data: { code: 'SETTLEMENT_EXCEEDS_BALANCE' } } })
    await mountPage()
    await openDetail()
    setField('amount', '9000000')
    click('submit-entry')
    await flushPromises()
    click('confirm-entry')
    await flushPromises()
    expect(body().textContent).toContain('Setoran melebihi saldo yang tersisa')
  })

  it('blocks an adjustment without a note and never posts', async () => {
    await mountPage()
    await openDetail()
    click('kind-adjustment')
    await flushPromises()
    setField('amount', '-1000')
    click('submit-entry')
    await flushPromises()
    expect(body().textContent).toContain('Catatan wajib diisi untuk penyesuaian')
    expect(record).not.toHaveBeenCalled()
  })

  it('accepts a negative adjustment with a note (after confirmation)', async () => {
    record.mockResolvedValue({})
    await mountPage()
    await openDetail()
    click('kind-adjustment')
    await flushPromises()
    setField('amount', '-1000')
    setField('note', 'koreksi salah catat')
    click('submit-entry')
    await flushPromises()
    click('confirm-entry')
    await flushPromises()
    expect(record).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({
        kind: 'adjustment',
        amount: '-1000.00',
        note: 'koreksi salah catat',
      }),
    )
  })

  it('refetches balances and entries after success', async () => {
    record.mockResolvedValue({})
    await mountPage()
    await openDetail()
    const listCalls = list.mock.calls.length
    const entryCalls = entries.mock.calls.length
    setField('amount', '1000')
    click('submit-entry')
    await flushPromises()
    click('confirm-entry')
    await flushPromises()
    expect(list.mock.calls.length).toBeGreaterThan(listCalls)
    expect(entries.mock.calls.length).toBeGreaterThan(entryCalls)
  })
})
