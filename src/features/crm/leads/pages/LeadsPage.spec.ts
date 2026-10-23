import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const summary = vi.hoisted(() => vi.fn())
const push = vi.hoisted(() => vi.fn())
const replace = vi.hoisted(() => vi.fn())
const createMutate = vi.hoisted(() => vi.fn())
vi.mock('@/features/entitlements/api/entitlements.api', () => ({ entitlementsApi: { summary } }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/app/crm/leads', query: { tab: 'all' } }),
  useRouter: () => ({ push, replace }),
}))
vi.mock('@/features/crm/leads/api/leads.queries', () => ({
  useCreateLeadMutation: () => ({ mutateAsync: createMutate, isPending: { value: false } }),
  useUpdateLeadMutation: () => ({ mutateAsync: vi.fn(), isPending: { value: false } }),
}))

import LeadsPage from './LeadsPage.vue'

const quota = (atLimit: boolean) => [
  {
    feature_key: 'crm.max_leads',
    module: 'crm',
    name: 'Maks. lead',
    state: 'quota',
    limit: 50,
    used: atLimit ? 50 : 3,
    remaining: atLimit ? 0 : 47,
    reset_strategy: 'never',
    at_limit: atLimit,
  },
]

const LeadsTableStub = defineComponent({
  emits: ['edit', 'open'],
  setup(_, { emit }) {
    return () =>
      h('button', { 'data-testid': 'edit-lead', onClick: () => emit('edit', { id: 'l1' }) }, 'edit')
  },
})

async function mountPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const w = mount(LeadsPage, {
    global: {
      plugins: [[VueQueryPlugin, { queryClient: client }]],
      stubs: {
        LeadsTable: LeadsTableStub,
        LeadsOverview: true,
        BaseModal: { props: ['open', 'title'], template: '<div v-if="open"><slot /></div>' },
        RouterLink: { template: '<a><slot /></a>' },
      },
    },
  })
  await flushPromises()
  return w
}

describe('LeadsPage quota', () => {
  beforeEach(() => {
    push.mockClear()
    createMutate.mockReset()
  })

  it('shows banner and upgrade button when lead quota is full', async () => {
    summary.mockResolvedValue(quota(true))
    const w = await mountPage()
    expect(w.get('[role="status"]').text()).toContain('Kuota lead')
    expect(w.text()).toContain('Upgrade untuk tambah lead')
    expect(w.text()).not.toContain('Lead Baru')
    const upgrade = w.findAll('button').find((b) => b.text() === 'Upgrade untuk tambah lead')!
    await upgrade.trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'billing' })
  })

  it('keeps list and edit available when quota is full', async () => {
    summary.mockResolvedValue(quota(true))
    const w = await mountPage()
    await w.get('[data-testid="edit-lead"]').trigger('click')
    expect(w.text()).toContain('Nama Kontak')
  })

  it('shows normal add button when room', async () => {
    summary.mockResolvedValue(quota(false))
    const w = await mountPage()
    expect(w.find('[role="status"]').exists()).toBe(false)
    expect(w.text()).toContain('Lead Baru')
    await w
      .findAll('button')
      .find((b) => b.text().includes('Lead Baru'))!
      .trigger('click')
    expect(w.text()).toContain('Nama Kontak')
  })

  it('shows the quota message when create is rejected with 409 QUOTA_EXCEEDED', async () => {
    summary.mockResolvedValue(quota(false))
    createMutate.mockRejectedValue({
      response: {
        status: 409,
        data: { code: 'QUOTA_EXCEEDED', message: 'billing quota has been exceeded' },
      },
    })
    const w = await mountPage()
    await w
      .findAll('button')
      .find((b) => b.text().includes('Lead Baru'))!
      .trigger('click')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain(
      'Kuota lead paket Anda sudah penuh. Upgrade plan untuk menambah lead baru.',
    )
    expect(w.text()).not.toContain('billing quota has been exceeded')
  })
})
