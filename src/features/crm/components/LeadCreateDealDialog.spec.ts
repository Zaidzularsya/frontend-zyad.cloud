import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const mutateAsync = vi.hoisted(() => vi.fn())
vi.mock('@/features/crm/leads/api/leads.queries', () => ({
  useCreateLeadDealMutation: () => ({ mutateAsync, isPending: { value: false } }),
  useCrmMembersQuery: () => ({ data: { value: [] } }),
}))
vi.mock('@/features/crm/pipelines/api/pipelines.queries', () => ({
  usePipelinesQuery: () => ({ data: { value: { data: [] } }, isSuccess: { value: true } }),
}))
vi.mock('@/features/crm/leads/utils/convert-form', () => ({
  prefillDealForm: () => ({ pipelineId: 'p1' }),
  validateDealForm: () => '',
  buildDealInput: () => ({}),
}))

import LeadCreateDealDialog from './LeadCreateDealDialog.vue'

async function submitWith(error: unknown) {
  mutateAsync.mockRejectedValue(error)
  const w = mount(LeadCreateDealDialog, {
    props: { lead: { id: 'l1' } as never },
    global: {
      stubs: {
        BaseModal: { template: '<div><slot /></div>' },
        DealFormFields: true,
      },
    },
  })
  await w.get('form').trigger('submit')
  await flushPromises()
  return w
}

describe('LeadCreateDealDialog', () => {
  it('shows the quota message on 409 QUOTA_EXCEEDED', async () => {
    const w = await submitWith({ response: { status: 409, data: { code: 'QUOTA_EXCEEDED' } } })
    expect(w.get('[role="alert"]').text()).toBe(
      'Kuota deal paket Anda sudah penuh. Upgrade plan untuk menambah deal baru.',
    )
  })

  it('shows the generic error for other failures', async () => {
    const w = await submitWith(new Error('boom'))
    expect(w.get('[role="alert"]').text()).toBe('Deal gagal dibuat. Coba lagi.')
  })
})
