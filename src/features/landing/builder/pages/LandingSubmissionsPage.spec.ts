import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const api = vi.hoisted(() => ({
  listSubmissions: vi.fn(),
  retrySubmissionCrmSync: vi.fn(),
  getPages: vi.fn(),
}))

vi.mock('@/features/landing/shared/api/landing.api', () => ({ landingApi: api }))
vi.mock('vue-router', () => ({ useRoute: () => ({ name: 'landing-pages-submissions' }) }))

import { useAuthStore } from '@/stores/auth.store'
import LandingSubmissionsPage from './LandingSubmissionsPage.vue'

function sub(over: Record<string, unknown> = {}) {
  return {
    id: 's1',
    landing_page_id: 'p1',
    form_id: 'f1',
    reference: 'REF-1',
    status: 'submitted',
    submitted_data: { name: 'Budi', email: 'budi@example.com', phone: '0812345678' },
    submitted_at: '2026-10-07T03:00:00Z',
    crm_lead_id: null,
    crm_sync_status: 'skipped',
    crm_sync_error: null,
    ...over,
  }
}

function listOf(data: unknown[], hasMore = false) {
  return { data, meta: { total: data.length, has_more: hasMore } }
}

function mountPage(
  permissions: string[] = ['landing.submission.read', 'landing.submission.update', 'lead.read'],
) {
  const auth = useAuthStore()
  auth.user = { id: 'u1', name: 'U', email: 'u@x.com', permissions } as never
  return mount(LandingSubmissionsPage, {
    global: {
      stubs: {
        RouterLink: {
          props: ['to'],
          template: '<a class="lead-link" :data-to="JSON.stringify(to)"><slot /></a>',
        },
      },
    },
  })
}

describe('LandingSubmissionsPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    api.getPages.mockResolvedValue({
      data: [
        { id: 'p1', title: 'Beranda' },
        { id: 'p2', title: 'Harga' },
      ],
    })
    api.listSubmissions.mockResolvedValue(listOf([]))
  })

  it('shows the empty state', async () => {
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('Belum ada kiriman form.')
  })

  it('shows an error state when loading fails', async () => {
    api.listSubmissions.mockRejectedValue(new Error('boom'))
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('Gagal memuat kiriman form.')
    expect(wrapper.text()).not.toContain('Belum ada kiriman form.')
  })

  it('renders all four CRM statuses with data from submitted_data and page title', async () => {
    api.listSubmissions.mockResolvedValue(
      listOf([
        sub({ id: 's1', crm_sync_status: 'created', crm_lead_id: 'l1' }),
        sub({ id: 's2', crm_sync_status: 'merged', crm_lead_id: 'l2', submitted_data: {} }),
        sub({ id: 's3', crm_sync_status: 'skipped' }),
        sub({ id: 's4', crm_sync_status: 'failed', crm_sync_error: 'PIC lead belum diatur' }),
      ]),
    )
    const wrapper = mountPage()
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('Lead dibuat')
    expect(text).toContain('Digabung ke lead')
    expect(text).toContain('Tidak dikirim')
    expect(text).toContain('Gagal')
    expect(text).toContain('PIC lead belum diatur')
    expect(text).toContain('Budi')
    expect(text).toContain('budi@example.com')
    expect(text).toContain('0812345678')
    expect(text).toContain('Beranda')
    const links = wrapper.findAll('a.lead-link')
    expect(links).toHaveLength(2)
    expect(links[0]!.attributes('data-to')).toContain('crm-lead-detail')
    expect(links[0]!.attributes('data-to')).toContain('l1')
  })

  it('renders lead status as plain text without lead.read permission', async () => {
    api.listSubmissions.mockResolvedValue(
      listOf([sub({ crm_sync_status: 'created', crm_lead_id: 'l1' })]),
    )
    const wrapper = mountPage(['landing.submission.read'])
    await flushPromises()
    expect(wrapper.text()).toContain('Lead dibuat')
    expect(wrapper.findAll('a.lead-link')).toHaveLength(0)
  })

  it('retries a failed row and updates it in place', async () => {
    api.listSubmissions.mockResolvedValue(
      listOf([
        sub({ id: 's4', crm_sync_status: 'failed', crm_sync_error: 'PIC lead belum diatur' }),
      ]),
    )
    api.retrySubmissionCrmSync.mockResolvedValue(
      sub({ id: 's4', crm_sync_status: 'created', crm_lead_id: 'l9' }),
    )
    const wrapper = mountPage()
    await flushPromises()
    const button = wrapper.findAll('button').find((b) => b.text().includes('Kirim ulang ke CRM'))!
    await button.trigger('click')
    await flushPromises()
    expect(api.retrySubmissionCrmSync).toHaveBeenCalledWith('s4')
    expect(wrapper.text()).toContain('Lead dibuat')
    expect(wrapper.text()).not.toContain('Kirim ulang ke CRM')
    expect(wrapper.text()).not.toContain('PIC lead belum diatur')
  })

  it('shows an error and keeps the row failed when retry fails', async () => {
    api.listSubmissions.mockResolvedValue(
      listOf([sub({ id: 's4', crm_sync_status: 'failed', crm_sync_error: 'x' })]),
    )
    api.retrySubmissionCrmSync.mockRejectedValue(new Error('boom'))
    const wrapper = mountPage()
    await flushPromises()
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Kirim ulang ke CRM'))!
      .trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Gagal mengirim ulang ke CRM.')
    expect(wrapper.text()).toContain('Kirim ulang ke CRM')
  })

  it('hides the retry button without landing.submission.update', async () => {
    api.listSubmissions.mockResolvedValue(
      listOf([sub({ crm_sync_status: 'failed', crm_sync_error: 'x' })]),
    )
    const wrapper = mountPage(['landing.submission.read'])
    await flushPromises()
    expect(wrapper.text()).toContain('Gagal')
    expect(wrapper.text()).not.toContain('Kirim ulang ke CRM')
  })

  it('has no search box and paginates with has_more', async () => {
    api.listSubmissions.mockResolvedValueOnce(listOf([sub()], true))
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.find('input[type="search"]').exists()).toBe(false)
    expect(api.listSubmissions).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, per_page: 20 }),
    )
    const prev = wrapper.findAll('button').find((b) => b.text() === 'Sebelumnya')!
    const next = wrapper.findAll('button').find((b) => b.text() === 'Berikutnya')!
    expect(prev.attributes('disabled')).toBeDefined()
    expect(next.attributes('disabled')).toBeUndefined()

    api.listSubmissions.mockResolvedValueOnce(listOf([sub({ id: 's2' })], false))
    await next.trigger('click')
    await flushPromises()
    expect(api.listSubmissions).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))
    const next2 = wrapper.findAll('button').find((b) => b.text() === 'Berikutnya')!
    expect(next2.attributes('disabled')).toBeDefined()
  })

  it('filters by landing page and resets to page 1', async () => {
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.find('select').setValue('p2')
    await flushPromises()
    expect(api.listSubmissions).toHaveBeenLastCalledWith(
      expect.objectContaining({ landing_page_id: 'p2', page: 1 }),
    )
  })
})
