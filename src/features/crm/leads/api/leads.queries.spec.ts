import { describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const create = vi.hoisted(() => vi.fn())
const del = vi.hoisted(() => vi.fn())
const restore = vi.hoisted(() => vi.fn())
const disqualify = vi.hoisted(() => vi.fn())
const convert = vi.hoisted(() => vi.fn())
const createDeal = vi.hoisted(() => vi.fn())
vi.mock('@/features/crm/leads/api/leads.api', () => ({
  leadsApi: { create, delete: del, restore, disqualify, convert, createDeal },
}))

import {
  useConvertLeadMutation,
  useCreateLeadDealMutation,
  useCreateLeadMutation,
  useDeleteLeadMutation,
  useDisqualifyLeadMutation,
  useRestoreLeadMutation,
} from './leads.queries'

function setup(hook: () => unknown = useCreateLeadMutation) {
  const client = new QueryClient()
  const spy = vi.spyOn(client, 'invalidateQueries')
  let mutation!: ReturnType<typeof useCreateLeadMutation>
  mount(
    defineComponent({
      setup() {
        mutation = hook() as ReturnType<typeof useCreateLeadMutation>
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

describe.each([
  ['useDeleteLeadMutation', useDeleteLeadMutation, del],
  ['useRestoreLeadMutation', useRestoreLeadMutation, restore],
  ['useDisqualifyLeadMutation', useDisqualifyLeadMutation, disqualify],
])('%s entitlement invalidation', (_name, hook, api) => {
  it('invalidates entitlements after success (quota usage changed)', async () => {
    api.mockResolvedValue(undefined)
    const { mutation, spy } = setup(hook)
    await mutation.mutateAsync({} as never)
    await flushPromises()
    expect(entitlementCalls(spy)).toHaveLength(1)
  })

  it('does not invalidate entitlements on failure', async () => {
    api.mockRejectedValue(new Error('boom'))
    const { mutation, spy } = setup(hook)
    await expect(mutation.mutateAsync({} as never)).rejects.toBeTruthy()
    await flushPromises()
    expect(entitlementCalls(spy)).toHaveLength(0)
  })
})

describe.each([
  ['useConvertLeadMutation', useConvertLeadMutation, convert],
  ['useCreateLeadDealMutation', useCreateLeadDealMutation, createDeal],
])('%s entitlement invalidation', (_name, hook, api) => {
  it('invalidates entitlements on success', async () => {
    api.mockResolvedValue({})
    const { mutation, spy } = setup(hook)
    await mutation.mutateAsync({ id: 'l1', payload: {} } as never)
    await flushPromises()
    expect(entitlementCalls(spy)).toHaveLength(1)
  })

  it('invalidates entitlements on quota-exceeded 409', async () => {
    api.mockRejectedValue({ response: { status: 409, data: { code: 'QUOTA_EXCEEDED' } } })
    const { mutation, spy } = setup(hook)
    await expect(mutation.mutateAsync({ id: 'l1', payload: {} } as never)).rejects.toBeTruthy()
    await flushPromises()
    expect(entitlementCalls(spy)).toHaveLength(1)
  })
})
