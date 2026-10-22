import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const summary = vi.hoisted(() => vi.fn())
const push = vi.hoisted(() => vi.fn())
const domains = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn() }))
const landing = vi.hoisted(() => ({
  getAvailableDomains: vi.fn(),
  getAllDomainBindings: vi.fn(),
  getPages: vi.fn(),
}))

vi.mock('@/features/entitlements/api/entitlements.api', () => ({ entitlementsApi: { summary } }))
vi.mock('@/features/domains/api/domain.api', () => ({ organizationDomainService: domains }))
vi.mock('@/features/landing/shared/api/landing.api', () => ({ landingApi: landing }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {}, fullPath: '/' }),
  useRouter: () => ({ push }),
}))

import DomainManagementPage from './DomainManagementPage.vue'

const quota = (atLimit: boolean) => [
  {
    feature_key: 'domain.max_domains',
    module: 'domain',
    name: 'Maks. domain',
    state: 'quota',
    limit: 1,
    used: atLimit ? 1 : 0,
    remaining: atLimit ? 0 : 1,
    reset_strategy: 'never',
    at_limit: atLimit,
  },
]

const existing = {
  id: 'd1',
  organization_id: 'o1',
  type: 'custom',
  canonical_host: 'tokoanda.com',
  status: 'active',
  is_primary: true,
  verification_attempts: 0,
  ssl_status: 'active',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
}

async function mountPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const spy = vi.spyOn(client, 'invalidateQueries')
  const w = mount(DomainManagementPage, {
    props: { mode: 'workspace', title: 'Domains', description: 'Kelola domain' },
    global: { plugins: [[VueQueryPlugin, { queryClient: client }]] },
  })
  await flushPromises()
  return { w, spy }
}

describe('DomainManagementPage quota', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    domains.list.mockResolvedValue([existing])
    landing.getAvailableDomains.mockResolvedValue({ data: [] })
    landing.getAllDomainBindings.mockResolvedValue({ data: [] })
    landing.getPages.mockResolvedValue({ data: [] })
  })

  it('shows banner and upgrade button when domain quota is full', async () => {
    summary.mockResolvedValue(quota(true))
    const { w } = await mountPage()
    expect(w.get('[role="status"]').text()).toContain('Kuota domain')
    expect(w.text()).not.toContain('+ Add Domain')
    await w
      .findAll('button')
      .find((b) => b.text() === 'Upgrade untuk tambah domain')!
      .trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'billing' })
  })

  it('keeps the domain list available when quota is full', async () => {
    summary.mockResolvedValue(quota(true))
    const { w } = await mountPage()
    expect(w.text()).toContain('tokoanda.com')
  })

  it('shows normal add button when room', async () => {
    summary.mockResolvedValue(quota(false))
    const { w } = await mountPage()
    expect(w.find('[role="status"]').exists()).toBe(false)
    await w
      .findAll('button')
      .find((b) => b.text().includes('+ Add Domain'))!
      .trigger('click')
    expect(w.text()).toContain('Pilih tipe domain')
  })

  it('shows the quota message and refreshes entitlements on a 409 create', async () => {
    summary.mockResolvedValue(quota(false))
    domains.create.mockRejectedValue({
      response: { status: 409, data: { code: 'QUOTA_EXCEEDED', message: 'x' } },
    })
    const { w, spy } = await mountPage()
    await w
      .findAll('button')
      .find((b) => b.text().includes('+ Add Domain'))!
      .trigger('click')
    await w.get('input[placeholder="tokoanda.com"]').setValue('baru-domain.com')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Kuota domain paket Anda sudah penuh')
    const calls = spy.mock.calls.filter(
      ([f]) => (f as { queryKey?: unknown[] })?.queryKey?.[0] === 'entitlements',
    )
    expect(calls.length).toBeGreaterThan(0)
  })
})
