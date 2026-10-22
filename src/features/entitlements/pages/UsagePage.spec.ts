import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const summary = vi.hoisted(() => vi.fn())
const subscription = vi.hoisted(() => vi.fn())
vi.mock('../api/entitlements.api', () => ({ entitlementsApi: { summary } }))
vi.mock('@/features/customer/api/self-serve.api', () => ({
  selfServeApi: { subscription },
}))

import UsagePage from './UsagePage.vue'

const item = (over: Record<string, unknown> = {}) => ({
  feature_key: 'crm.max_contacts',
  module: 'crm',
  name: 'Maks. contact',
  state: 'quota',
  limit: 100,
  used: 100,
  remaining: 0,
  reset_strategy: 'never',
  at_limit: true,
  ...over,
})

async function mountPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const w = mount(UsagePage, {
    global: {
      plugins: [[VueQueryPlugin, { queryClient: client }]],
      stubs: { RouterLink: { props: ['to'], template: '<a data-testid="upgrade"><slot /></a>' } },
    },
  })
  await flushPromises()
  return w
}

describe('UsagePage', () => {
  it('renders bar and "penuh" label for full quota', async () => {
    subscription.mockRejectedValue(new Error('x'))
    summary.mockResolvedValue([item()])
    const w = await mountPage()
    const bar = w.find('[role="progressbar"]')
    expect(bar.attributes('aria-valuenow')).toBe('100')
    expect(w.text()).toContain('100 / 100')
    expect(w.text()).toContain('penuh')
    expect(w.text()).toContain('Paket Anda')
  })

  it('shows tombol Upgrade plan', async () => {
    subscription.mockResolvedValue({ product: { name: 'Free' } })
    summary.mockResolvedValue([item({ at_limit: false, used: 3 })])
    const w = await mountPage()
    expect(w.find('[data-testid="upgrade"]').text()).toBe('Upgrade plan')
    expect(w.text()).toContain('Paket Free')
    expect(w.text()).not.toContain('penuh')
  })

  it('shows friendly message when summary fails', async () => {
    subscription.mockRejectedValue(new Error('x'))
    summary.mockRejectedValue(new Error('boom'))
    const w = await mountPage()
    expect(w.find('[role="alert"]').exists()).toBe(true)
  })
})
