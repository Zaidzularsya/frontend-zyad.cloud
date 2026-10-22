import { describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const create = vi.hoisted(() => vi.fn())
vi.mock('@/features/crm/leads/api/leads.api', () => ({ leadsApi: { create } }))

import { useCreateLeadMutation } from './leads.queries'

function setup() {
  const client = new QueryClient()
  const spy = vi.spyOn(client, 'invalidateQueries')
  let mutation!: ReturnType<typeof useCreateLeadMutation>
  mount(
    defineComponent({
      setup() {
        mutation = useCreateLeadMutation()
        return () => null
      },
    }),
    { global: { plugins: [[VueQueryPlugin, { queryClient: client }]] } },
  )
  return { mutation, spy }
}

const entitlementCalls = (spy: ReturnType<typeof setup>['spy']) =>
  spy.mock.calls.filter(([f]) => (f as { queryKey?: unknown[] })?.queryKey?.[0] === 'entitlements')

describe('useCreateLeadMutation entitlement invalidation', () => {
  it('invalidates entitlements after a quota-exceeded 409', async () => {
    create.mockRejectedValue({ response: { status: 409, data: { code: 'QUOTA_EXCEEDED' } } })
    const { mutation, spy } = setup()
    await expect(mutation.mutateAsync({} as never)).rejects.toBeTruthy()
    await flushPromises()
    expect(entitlementCalls(spy)).toHaveLength(1)
  })

  it('does not invalidate entitlements for other errors', async () => {
    create.mockRejectedValue(new Error('boom'))
    const { mutation, spy } = setup()
    await expect(mutation.mutateAsync({} as never)).rejects.toBeTruthy()
    await flushPromises()
    expect(entitlementCalls(spy)).toHaveLength(0)
  })
})
