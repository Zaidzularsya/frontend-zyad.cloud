import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const state = vi.hoisted(() => ({ canRead: true, summary: [] as unknown[] }))
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({ can: () => state.canRead }),
}))
vi.mock('@/features/entitlements/api/entitlements.api', () => ({
  entitlementsApi: { summary: vi.fn(() => Promise.resolve(state.summary)) },
}))
vi.mock('@/features/receivable/api/receivable.api', () => ({
  receivableApi: { accounts: { list: vi.fn() }, invoices: { list: vi.fn() } },
}))
vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: { onboarding: { customerStatus: vi.fn() }, policy: { set: vi.fn() } },
}))

import ContactNetworkStatus from '@/features/mikrotik/components/ContactNetworkStatus.vue'
import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import { receivableApi } from '@/features/receivable/api/receivable.api'

const on = [{ feature_key: 'mikrotik.enabled', state: 'enabled' }]

async function mountIt() {
  const w = mount(ContactNetworkStatus, {
    props: { contactId: 'c1' },
    global: {
      plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]],
      stubs: { RouterLink: { template: '<a><slot /></a>' } },
    },
  })
  await flushPromises()
  return w
}

describe('ContactNetworkStatus', () => {
  beforeEach(() => {
    state.canRead = true
    state.summary = on
    vi.mocked(receivableApi.accounts.list).mockReset()
    vi.mocked(receivableApi.invoices.list)
      .mockReset()
      .mockResolvedValue({ data: [], meta: {} } as never)
    vi.mocked(mikrotikApi.onboarding.customerStatus)
      .mockReset()
      .mockResolvedValue([
        { account_id: 'a1', isolation_state: 'normal', exempt: false, secrets: 1 },
      ])
  })

  it('shows a muted message when the contact has no receivable account', async () => {
    vi.mocked(receivableApi.accounts.list).mockResolvedValue({ data: [], meta: {} } as never)
    const w = await mountIt()
    expect(receivableApi.accounts.list).toHaveBeenCalledWith(
      expect.objectContaining({ contact_id: 'c1' }),
    )
    expect(w.text()).toContain('Kontak ini belum menjadi pelanggan penagihan')
    expect(mikrotikApi.onboarding.customerStatus).not.toHaveBeenCalled()
  })

  it('renders the status card when an account exists', async () => {
    vi.mocked(receivableApi.accounts.list).mockResolvedValue({
      data: [{ id: 'a1', name: 'Budi' }],
      meta: {},
    } as never)
    const w = await mountIt()
    expect(mikrotikApi.onboarding.customerStatus).toHaveBeenCalledWith(['a1'])
    expect(w.text()).toContain('Aktif')
  })

  it.each([
    ['feature off', () => (state.summary = [])],
    ['no permission', () => (state.canRead = false)],
  ])('renders nothing and fires no requests when %s', async (_n, setup) => {
    setup()
    const w = await mountIt()
    expect(w.text()).toBe('')
    expect(receivableApi.accounts.list).not.toHaveBeenCalled()
    expect(mikrotikApi.onboarding.customerStatus).not.toHaveBeenCalled()
  })
})
