import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const summary = vi.hoisted(() => vi.fn())
const push = vi.hoisted(() => vi.fn())
vi.mock('../api/entitlements.api', () => ({ entitlementsApi: { summary } }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

import QuotaActionButton from './QuotaActionButton.vue'

const item = (at_limit: boolean) => ({
  feature_key: 'crm.max_leads',
  module: 'crm',
  name: 'Maks. lead',
  state: 'quota',
  limit: 50,
  used: at_limit ? 50 : 3,
  remaining: at_limit ? 0 : 47,
  reset_strategy: 'never',
  at_limit,
})

async function mountButton() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const w = mount(QuotaActionButton, {
    props: {
      featureKey: 'crm.max_leads',
      label: 'Tambah Lead',
      upgradeLabel: 'Upgrade untuk tambah lead',
    },
    slots: { icon: '<i data-testid="icon" />' },
    global: { plugins: [[VueQueryPlugin, { queryClient: client }]] },
  })
  await flushPromises()
  return w
}

describe('QuotaActionButton', () => {
  it('shows the normal label and emits click when there is room', async () => {
    summary.mockResolvedValue([item(false)])
    push.mockClear()
    const w = await mountButton()
    expect(w.text()).toBe('Tambah Lead')
    expect(w.find('[data-testid="icon"]').exists()).toBe(true)
    await w.get('button').trigger('click')
    expect(w.emitted('click')).toHaveLength(1)
    expect(push).not.toHaveBeenCalled()
  })

  it('swaps label and navigates to upgrade without emitting click at limit', async () => {
    summary.mockResolvedValue([item(true)])
    push.mockClear()
    const w = await mountButton()
    expect(w.text()).toBe('Upgrade untuk tambah lead')
    expect(w.find('[data-testid="icon"]').exists()).toBe(false)
    await w.get('button').trigger('click')
    expect(w.emitted('click')).toBeUndefined()
    expect(push).toHaveBeenCalledWith({ name: 'billing' })
  })
})
