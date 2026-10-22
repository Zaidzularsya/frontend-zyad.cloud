import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const summary = vi.hoisted(() => vi.fn())
vi.mock('../api/entitlements.api', () => ({ entitlementsApi: { summary } }))

import QuotaLimitBanner from './QuotaLimitBanner.vue'

const item = (used: number, at_limit: boolean) => ({
  feature_key: 'crm.max_leads',
  module: 'crm',
  name: 'Maks. lead',
  state: 'quota',
  limit: 50,
  used,
  remaining: 50 - used,
  reset_strategy: 'never',
  at_limit,
})

async function mountBanner() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const w = mount(QuotaLimitBanner, {
    props: { featureKey: 'crm.max_leads', noun: 'lead' },
    global: {
      plugins: [[VueQueryPlugin, { queryClient: client }]],
      stubs: { RouterLink: { props: ['to'], template: '<a data-testid="upgrade"><slot /></a>' } },
    },
  })
  await flushPromises()
  return w
}

describe('QuotaLimitBanner', () => {
  it('is not rendered when not at limit', async () => {
    summary.mockResolvedValue([item(10, false)])
    expect((await mountBanner()).find('[role="status"]').exists()).toBe(false)
  })

  it('is not rendered at 80% usage', async () => {
    summary.mockResolvedValue([item(40, false)])
    expect((await mountBanner()).find('[role="status"]').exists()).toBe(false)
  })

  it('shows used of limit with an upgrade link when at limit', async () => {
    summary.mockResolvedValue([item(50, true)])
    const w = await mountBanner()
    const banner = w.get('[role="status"]')
    expect(banner.text()).toContain('50 dari 50')
    expect(banner.text()).toContain('Kuota lead')
    expect(w.find('[data-testid="upgrade"]').exists()).toBe(true)
  })

  it('is not rendered while loading', () => {
    summary.mockReturnValue(new Promise(() => {}))
    const client = new QueryClient()
    const w = mount(QuotaLimitBanner, {
      props: { featureKey: 'crm.max_leads', noun: 'lead' },
      global: { plugins: [[VueQueryPlugin, { queryClient: client }]], stubs: { RouterLink: true } },
    })
    expect(w.find('[role="status"]').exists()).toBe(false)
  })
})
