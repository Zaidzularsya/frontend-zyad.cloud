import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'

const { updateCompany, listOrganizations } = vi.hoisted(() => ({
  updateCompany: vi.fn(),
  listOrganizations: vi.fn(),
}))
vi.mock('@/features/crm/companies/api/companies.api', () => ({
  companiesApi: { update: updateCompany },
}))
vi.mock('@/features/platform/api/organizations.api', () => ({
  platformOrganizationsApi: { list: listOrganizations },
}))

import { useAuthStore } from '@/stores/auth.store'
import { useTenantStore } from '@/stores/tenant.store'
import CompanyWorkspaceLink from './CompanyWorkspaceLink.vue'

const linkedCompany = {
  id: 'co-1',
  tenant_organization: { id: 'ws-1', name: 'Studio Rina', slug: 'studio-rina', status: 'active' },
}

function setup(options: { platform?: boolean; permission?: boolean } = {}) {
  const { platform = true, permission = true } = options
  const pinia = createPinia()
  setActivePinia(pinia)
  const tenant = useTenantStore()
  tenant.hydrate([
    {
      id: 't1',
      name: 'Org',
      slug: 'org',
      plan: 'growth',
      status: 'active',
      organizationType: platform ? 'platform' : 'customer',
    },
  ])
  const auth = useAuthStore()
  auth.user = {
    id: 'u1',
    name: 'U',
    email: 'u@example.com',
    permissions: permission ? ['company.link_workspace'] : [],
  } as never
  return pinia
}

function mountLink(company: object, pinia: ReturnType<typeof createPinia>) {
  return mount(CompanyWorkspaceLink, {
    props: { company: company as never },
    global: { plugins: [pinia, [VueQueryPlugin, { queryClient: new QueryClient() }]] },
  })
}

beforeEach(() => {
  vi.useRealTimers()
  updateCompany.mockReset().mockResolvedValue({})
  listOrganizations.mockReset().mockResolvedValue({
    data: [
      { id: 'ws-2', name: 'Toko Budi', slug: 'toko-budi', type: 'customer', status: 'active' },
    ],
    meta: {},
  })
})

describe('CompanyWorkspaceLink', () => {
  it('shows the linked workspace with its status badge', () => {
    const w = mountLink(linkedCompany, setup())
    expect(w.text()).toContain('Studio Rina')
    expect(w.text()).toContain('studio-rina')
    expect(w.get('[data-testid="workspace-status"]').text()).toBe('active')
  })

  it('is hidden without the permission or outside the platform organization', () => {
    expect(
      mountLink(linkedCompany, setup({ permission: false }))
        .find('[data-testid="workspace-link"]')
        .exists(),
    ).toBe(false)
    expect(
      mountLink(linkedCompany, setup({ platform: false }))
        .find('[data-testid="workspace-link"]')
        .exists(),
    ).toBe(false)
  })

  it('searches customer workspaces with a 300 ms debounce and links the chosen one', async () => {
    vi.useFakeTimers()
    const w = mountLink({ id: 'co-1', tenant_organization: null }, setup())
    await w
      .findAll('button')
      .find((b) => b.text() === 'Hubungkan')!
      .trigger('click')
    await flushPromises()
    listOrganizations.mockClear()

    await w.get('[data-testid="workspace-search"]').setValue('toko')
    await vi.advanceTimersByTimeAsync(299)
    expect(listOrganizations).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()
    expect(listOrganizations).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'toko', type: 'customer' }),
    )

    await w
      .findAll('li button')
      .find((b) => b.text().includes('Toko Budi'))!
      .trigger('click')
    await flushPromises()
    expect(updateCompany).toHaveBeenCalledWith('co-1', { tenant_organization_id: 'ws-2' })
    expect(w.emitted('changed')).toHaveLength(1)
  })

  it('explains a 409 conflict', async () => {
    updateCompany.mockRejectedValueOnce({ response: { status: 409, data: { message: 'x' } } })
    const w = mountLink({ id: 'co-1', tenant_organization: null }, setup())
    await w
      .findAll('button')
      .find((b) => b.text() === 'Hubungkan')!
      .trigger('click')
    await flushPromises()
    await w.findAll('li button')[0]!.trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Workspace ini sudah terhubung ke company lain')
    expect(w.emitted('changed')).toBeUndefined()
  })

  it('confirms before unlinking and sends null', async () => {
    const w = mountLink(linkedCompany, setup())
    await w
      .findAll('button')
      .find((b) => b.text() === 'Lepaskan')!
      .trigger('click')
    expect(w.text()).toContain('Fitur dari langganan company ini akan dicabut dari workspace.')
    expect(updateCompany).not.toHaveBeenCalled()
    await w.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(updateCompany).toHaveBeenCalledWith('co-1', { tenant_organization_id: null })
    expect(w.emitted('changed')).toHaveLength(1)
  })
})
