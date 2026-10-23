import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { defineComponent } from 'vue'

import type { EntitlementSummaryItem } from '../types'

const summary = vi.hoisted(() => vi.fn())
vi.mock('../api/entitlements.api', () => ({ entitlementsApi: { summary } }))

import { useEntitlement } from './useEntitlement'

const leads: EntitlementSummaryItem = {
  feature_key: 'crm.max_leads',
  module: 'crm',
  name: 'Maks. lead',
  unit: 'lead',
  state: 'quota',
  limit: 50,
  used: 50,
  remaining: 0,
  reset_strategy: 'never',
  at_limit: true,
}

function setup(key: string) {
  let result!: ReturnType<typeof useEntitlement>
  const Comp = defineComponent({
    setup() {
      result = useEntitlement(key)
      return () => null
    },
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  mount(Comp, { global: { plugins: [[VueQueryPlugin, { queryClient: client }]] } })
  return () => result
}

describe('useEntitlement', () => {
  it('returns hidden for missing key after load', async () => {
    summary.mockResolvedValue([leads])
    const get = setup('crm.unknown')
    await flushPromises()
    expect(get().isHidden.value).toBe(true)
    expect(get().state.value).toBe('hidden')
  })

  it('returns quota with used and limit', async () => {
    summary.mockResolvedValue([leads])
    const get = setup('crm.max_leads')
    await flushPromises()
    expect(get().state.value).toBe('quota')
    expect(get().used.value).toBe(50)
    expect(get().limit.value).toBe(50)
    expect(get().remaining.value).toBe(0)
    expect(get().isHidden.value).toBe(false)
  })

  it('atLimit true when at_limit', async () => {
    summary.mockResolvedValue([leads])
    const get = setup('crm.max_leads')
    await flushPromises()
    expect(get().atLimit.value).toBe(true)
  })

  it('atLimit false when quota has room', async () => {
    summary.mockResolvedValue([{ ...leads, used: 10, remaining: 40, at_limit: false }])
    const get = setup('crm.max_leads')
    await flushPromises()
    expect(get().atLimit.value).toBe(false)
  })

  it('not hidden while loading', () => {
    summary.mockReturnValue(new Promise(() => {}))
    const get = setup('crm.max_leads')
    expect(get().isLoading.value).toBe(true)
    expect(get().isHidden.value).toBe(false)
    expect(get().atLimit.value).toBe(false)
  })

  it('fails open when the summary request errors', async () => {
    summary.mockRejectedValue(new Error('boom'))
    const get = setup('crm.max_leads')
    await flushPromises()
    expect(get().isHidden.value).toBe(false)
    expect(get().atLimit.value).toBe(false)
  })
})
