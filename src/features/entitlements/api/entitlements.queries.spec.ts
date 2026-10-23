import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { defineComponent } from 'vue'

const summary = vi.hoisted(() => vi.fn())
vi.mock('./entitlements.api', () => ({ entitlementsApi: { summary } }))

import { entitlementKeys, useEntitlementSummaryQuery } from './entitlements.queries'

describe('useEntitlementSummaryQuery', () => {
  it('does not retry a failing request (fail fast on 401/403)', async () => {
    summary.mockRejectedValue({ response: { status: 403 } })
    // Klien default (retry 3x) — hook harus menimpa dengan retry: false.
    const client = new QueryClient()
    const Comp = defineComponent({
      setup() {
        useEntitlementSummaryQuery()
        return () => null
      },
    })
    mount(Comp, { global: { plugins: [[VueQueryPlugin, { queryClient: client }]] } })
    await flushPromises()
    const query = client.getQueryCache().find({ queryKey: entitlementKeys.summary() })
    expect(query?.options.retry).toBe(false)
    expect(summary).toHaveBeenCalledTimes(1)
  })
})
