import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const convertMutate = vi.hoisted(() => vi.fn())
vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/app/crm/leads', query: {} }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))
vi.mock('@/features/crm/leads/api/leads.queries', () => ({
  useLeadsQuery: () => ({
    data: {
      value: {
        data: [
          {
            id: 'l1',
            contact_name: 'Budi',
            status: 'qualified',
            score: 0,
            address: {},
            created_at: '2026-11-01T00:00:00Z',
            updated_at: '2026-11-01T00:00:00Z',
          },
        ],
        meta: { total: 1, page: 1, per_page: 20 },
      },
    },
    isPending: { value: false },
    isError: { value: false },
    isFetching: { value: false },
    refetch: vi.fn(),
  }),
  useCrmMembersQuery: () => ({ data: { value: [] } }),
  useDeleteLeadMutation: () => ({ mutateAsync: vi.fn(), isPending: { value: false } }),
  useAssignLeadMutation: () => ({ mutateAsync: vi.fn(), isPending: { value: false } }),
  useConvertLeadMutation: () => ({ mutateAsync: convertMutate, isPending: { value: false } }),
}))

import LeadsTable from './LeadsTable.vue'

const DialogStub = defineComponent({
  props: { lead: { type: Object, default: null } },
  setup(props) {
    return () => h('div', { 'data-testid': 'convert-dialog' }, props.lead ? 'open' : 'closed')
  },
})

describe('LeadsTable convert cepat', () => {
  it('convert cepat memakai dialog', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    const w = mount(LeadsTable, {
      global: {
        plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]],
        stubs: { LeadConvertDialog: DialogStub, RouterLink: true },
      },
    })
    await flushPromises()
    expect(w.get('[data-testid="convert-dialog"]').text()).toBe('closed')
    await w.get('button[aria-label="Convert Budi"]').trigger('click')
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(convertMutate).not.toHaveBeenCalled()
    expect(w.get('[data-testid="convert-dialog"]').text()).toBe('open')
    confirmSpy.mockRestore()
  })
})
