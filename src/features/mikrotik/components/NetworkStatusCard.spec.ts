import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const can = vi.hoisted(() => ({ update: true }))
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({
    can: (p: string) => (p === 'mikrotik_policy.update' ? can.update : true),
  }),
}))
vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: {
    onboarding: { customerStatus: vi.fn() },
    policy: { set: vi.fn() },
  },
}))
vi.mock('@/features/receivable/api/receivable.api', () => ({
  receivableApi: { invoices: { list: vi.fn() } },
}))

import NetworkStatusCard from '@/features/mikrotik/components/NetworkStatusCard.vue'
import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import { receivableApi } from '@/features/receivable/api/receivable.api'
import type { CustomerStatus } from '@/features/mikrotik/types'

const status = (over: Partial<CustomerStatus> = {}): CustomerStatus => ({
  account_id: 'a1',
  isolation_state: 'normal',
  exempt: false,
  secrets: 2,
  ...over,
})

async function mountCard() {
  const w = mount(NetworkStatusCard, {
    attachTo: document.body,
    props: { accountId: 'a1' },
    global: {
      plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]],
      stubs: {
        RouterLink: { props: ['to'], template: '<a :data-to="JSON.stringify(to)"><slot /></a>' },
      },
    },
  })
  await flushPromises()
  return w
}

const bodyButton = (label: string) =>
  Array.from(document.body.querySelectorAll('button')).find((b) => b.textContent?.trim() === label)

function setStatus(s: CustomerStatus, invoices: unknown[] = []) {
  vi.mocked(mikrotikApi.onboarding.customerStatus).mockResolvedValue([s])
  vi.mocked(receivableApi.invoices.list).mockResolvedValue({
    data: invoices,
    meta: { total: invoices.length },
  } as never)
}

describe('NetworkStatusCard', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    can.update = true
    vi.mocked(mikrotikApi.onboarding.customerStatus).mockReset()
    vi.mocked(mikrotikApi.policy.set)
      .mockReset()
      .mockResolvedValue({} as never)
    vi.mocked(receivableApi.invoices.list).mockReset()
  })

  it('shows Aktif with secret count', async () => {
    setStatus(status())
    const w = await mountCard()
    expect(w.text().toLowerCase()).not.toContain('pulihkan')
    expect(mikrotikApi.onboarding.customerStatus).toHaveBeenCalledWith(['a1'])
    expect(w.text()).toContain('Aktif')
    expect(w.text()).toContain('2 secret')
    expect(w.text()).not.toContain('Catat pembayaran')
  })

  it('shows Terisolir with note and a pay link to the oldest overdue invoice', async () => {
    setStatus(status({ isolation_state: 'isolated' }), [
      { id: 'i2', due_date: '2026-10-20' },
      { id: 'i1', due_date: '2026-10-05' },
    ])
    const w = await mountCard()
    expect(w.text()).toContain('Terisolir')
    expect(w.text()).toContain('Pelanggan dibuka otomatis setelah tagihan lunas')
    const link = w.findAll('a').find((a) => a.text() === 'Catat pembayaran')!
    expect(link.attributes('data-to')).toContain('i1')
  })

  it('warns when no secret is installed', async () => {
    setStatus(status({ isolation_state: 'none', secrets: 0 }))
    const w = await mountCard()
    expect(w.text()).toContain('Belum ada secret terpasang untuk pelanggan ini')
  })

  it('requires a reason before granting an exemption', async () => {
    setStatus(status())
    const w = await mountCard()
    await w
      .findAll('button')
      .find((b) => b.text() === 'Beri Pengecualian')!
      .trigger('click')
    await flushPromises()
    bodyButton('Simpan')!.click()
    await flushPromises()
    expect(mikrotikApi.policy.set).not.toHaveBeenCalled()
    const input = document.body.querySelector('textarea, input[name="reason"]') as HTMLInputElement
    input.value = 'Menunggu transfer'
    input.dispatchEvent(new Event('input'))
    await flushPromises()
    bodyButton('Simpan')!.click()
    await flushPromises()
    expect(mikrotikApi.policy.set).toHaveBeenCalledWith('a1', {
      exempt: true,
      reason: 'Menunggu transfer',
    })
  })

  it('grants an exemption with a WIB end date when one is picked', async () => {
    setStatus(status())
    const w = await mountCard()
    await w
      .findAll('button')
      .find((b) => b.text() === 'Beri Pengecualian')!
      .trigger('click')
    await flushPromises()
    const date = document.body.querySelector('input[name="exempted_until"]') as HTMLInputElement
    expect(document.body.textContent).toContain('Kosongkan untuk tanpa batas waktu')
    date.value = '2099-12-31'
    date.dispatchEvent(new Event('input'))
    const input = document.body.querySelector('textarea[name="reason"]') as HTMLTextAreaElement
    input.value = 'Menunggu transfer'
    input.dispatchEvent(new Event('input'))
    await flushPromises()
    bodyButton('Simpan')!.click()
    await flushPromises()
    expect(mikrotikApi.policy.set).toHaveBeenCalledWith('a1', {
      exempt: true,
      reason: 'Menunggu transfer',
      exempted_until: '2099-12-31',
    })
  })

  async function submitReason(text: string) {
    setStatus(status())
    const w = await mountCard()
    await w
      .findAll('button')
      .find((b) => b.text() === 'Beri Pengecualian')!
      .trigger('click')
    await flushPromises()
    const input = document.body.querySelector('textarea[name="reason"]') as HTMLTextAreaElement
    expect(input.getAttribute('maxlength')).toBe('500')
    input.value = text
    input.dispatchEvent(new Event('input'))
    await flushPromises()
    bodyButton('Simpan')!.click()
    await flushPromises()
  }

  it('rejects a reason longer than 500 characters without calling the API', async () => {
    await submitReason('a'.repeat(501))
    expect(mikrotikApi.policy.set).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Maksimal 500 karakter')
  })

  it('accepts a reason of exactly 500 characters', async () => {
    const reason = 'a'.repeat(500)
    await submitReason(reason)
    expect(mikrotikApi.policy.set).toHaveBeenCalledWith('a1', { exempt: true, reason })
  })

  it('allows lifting an exemption even when no secret is installed', async () => {
    setStatus(status({ isolation_state: 'none', secrets: 0, exempt: true }))
    const w = await mountCard()
    expect(w.text()).not.toContain('Beri Pengecualian')
    await w
      .findAll('button')
      .find((b) => b.text() === 'Cabut Pengecualian')!
      .trigger('click')
    await flushPromises()
    expect(mikrotikApi.policy.set).not.toHaveBeenCalled()
    bodyButton('Ya, cabut')!.click()
    await flushPromises()
    expect(mikrotikApi.policy.set).toHaveBeenCalledWith('a1', { exempt: false })
  })

  it('hides the exemption action without update permission and never offers restore', async () => {
    can.update = false
    setStatus(status({ isolation_state: 'isolated' }))
    const w = await mountCard()
    expect(w.text()).not.toContain('Beri Pengecualian')
    expect(w.text().toLowerCase()).not.toContain('pulihkan')
  })

  it('shows the exemption reason and allows removing it', async () => {
    vi.mocked(mikrotikApi.onboarding.customerStatus).mockResolvedValue([status({ exempt: true })])
    vi.mocked(receivableApi.invoices.list).mockResolvedValue({
      data: [],
      meta: { total: 0 },
    } as never)
    const w = await mountCard()
    expect(w.text()).toContain('Dikecualikan')
    await w
      .findAll('button')
      .find((b) => b.text() === 'Cabut Pengecualian')!
      .trigger('click')
    await flushPromises()
    expect(mikrotikApi.policy.set).not.toHaveBeenCalled()
    bodyButton('Ya, cabut')!.click()
    await flushPromises()
    expect(mikrotikApi.policy.set).toHaveBeenCalledWith('a1', { exempt: false })
  })

  it('warns about re-isolation and sends nothing when the confirmation is cancelled', async () => {
    vi.mocked(mikrotikApi.onboarding.customerStatus).mockResolvedValue([status({ exempt: true })])
    vi.mocked(receivableApi.invoices.list).mockResolvedValue({
      data: [],
      meta: { total: 0 },
    } as never)
    const w = await mountCard()
    await w
      .findAll('button')
      .find((b) => b.text() === 'Cabut Pengecualian')!
      .trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('dalam sekitar 2 menit')
    bodyButton('Batal')!.click()
    await flushPromises()
    expect(mikrotikApi.policy.set).not.toHaveBeenCalled()
    expect(bodyButton('Ya, cabut')).toBeUndefined()
  })
})
