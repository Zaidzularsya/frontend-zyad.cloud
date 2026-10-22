import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'

const summary = vi.hoisted(() => vi.fn())

vi.mock('@/features/entitlements/api/entitlements.api', () => ({ entitlementsApi: { summary } }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/app/crm/leads', name: 'crm-leads' }),
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}))
vi.mock('@/lib/permission', () => ({ hasPermission: () => true }))

import AppSidebar from './AppSidebar.vue'

const item = (feature_key: string, state: 'unlimited' | 'hidden') => ({
  feature_key,
  module: feature_key.split('.')[0],
  name: feature_key,
  state,
  reset_strategy: 'never',
  at_limit: false,
})

function mountSidebar() {
  setActivePinia(createPinia())
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return mount(AppSidebar, {
    global: {
      plugins: [[VueQueryPlugin, { queryClient: client }]],
      stubs: { RouterLink: { template: '<a><slot /></a>' } },
    },
  })
}

describe('AppSidebar entitlement filtering', () => {
  beforeEach(() => vi.clearAllMocks())

  it('hides menu items whose feature is hidden once the summary is loaded', async () => {
    summary.mockResolvedValue([
      item('crm.enabled', 'hidden'),
      item('receivable.enabled', 'unlimited'),
    ])
    const w = mountSidebar()
    await flushPromises()
    expect(w.text()).not.toContain('Leads')
    expect(w.text()).toContain('Invoices')
    // Produk is never tagged with a feature.
    expect(w.text()).toContain('Produk')
  })

  it('does not hide while summary loading', async () => {
    summary.mockReturnValue(new Promise(() => {}))
    const w = mountSidebar()
    await flushPromises()
    expect(w.text()).toContain('Leads')
    expect(w.text()).toContain('Invoices')
  })

  it('does not hide when the summary request fails', async () => {
    summary.mockRejectedValue(new Error('boom'))
    const w = mountSidebar()
    await flushPromises()
    expect(w.text()).toContain('Leads')
  })
})
