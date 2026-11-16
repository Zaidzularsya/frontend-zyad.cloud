import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'

const { get, can } = vi.hoisted(() => ({ get: vi.fn(), can: vi.fn() }))
vi.mock('@/features/receivable/api/receivable.api', () => ({
  receivableApi: {
    contracts: { get },
    arrears: { periods: vi.fn().mockResolvedValue({ periods: [], has_trigger_product: false }) },
  },
}))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => ({ can }) }))
vi.mock('@/features/mikrotik/composables/useMikrotikEnabled', () => ({
  useMikrotikEnabled: () => ({ value: false }),
}))

import ContractDetailPage from './ContractDetailPage.vue'

const contract = {
  id: 'ctr-1',
  contract_number: 'CTR-2026-0001',
  status: 'active',
  account: { id: 'acc-1', name: 'Budi', company_name: '' },
  start_date: '2026-08-05',
  end_date: null,
  end_reason: '',
  items: [],
  upcoming: [],
}

async function open(perms: string[]) {
  get.mockResolvedValue(contract)
  can.mockImplementation((p: string) => perms.includes(p))
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/app/sales/contracts/:id', component: ContractDetailPage }],
  })
  await router.push('/app/sales/contracts/ctr-1')
  const w = mount(ContractDetailPage, {
    global: {
      plugins: [router, [VueQueryPlugin, { queryClient: new QueryClient() }]],
      stubs: { teleport: true },
    },
  })
  await flushPromises()
  return w
}

const recordButton = (w: Awaited<ReturnType<typeof open>>) =>
  w.findAll('button').find((b) => b.text() === 'Catat tunggakan')

describe('ContractDetailPage arrears', () => {
  it('shows "Catat tunggakan" to roles with invoice.record_arrears and opens the dialog', async () => {
    const w = await open(['invoice.record_arrears'])
    expect(recordButton(w)).toBeDefined()
    await recordButton(w)!.trigger('click')
    expect(w.find('textarea[name="reason"]').exists()).toBe(true)
  })

  it('hides it without the permission', async () => {
    const w = await open(['contract.read'])
    expect(recordButton(w)).toBeUndefined()
  })
})
