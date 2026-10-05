import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'

const { update, get, link, responses, sentQuotation } = vi.hoisted(() => ({
  update: vi.fn(),
  get: vi.fn(),
  link: vi.fn(),
  responses: vi.fn(),
  sentQuotation: {
    id: 'q1',
    quotation_number: 'QUO-2026-0001',
    status: 'sent',
    revision_no: 0,
    has_pdf: true,
    deal_id: 'd1',
    subtotal: '100.00',
    discount_total: '0.00',
    tax_total: '11.00',
    grand_total: '111.00',
    currency: 'IDR',
    sent_at: '2026-10-02T03:00:00Z',
    items: [
      {
        id: 'i1',
        description: 'Internet',
        quantity: '1.00',
        unit_price: '100.00',
        tax_percent: '11.00',
        line_total: '100.00',
        position: 0,
      },
    ],
    created_at: '',
    updated_at: '',
  },
}))
vi.mock('@/features/crm/quotations/api/quotations.api', () => ({
  quotationsApi: {
    get,
    update,
    list: vi.fn().mockResolvedValue({ data: [], meta: {} }),
    sends: vi.fn().mockResolvedValue([]),
    link,
    responses,
  },
}))
vi.mock('@/features/crm/deals/api/deals.api', () => ({
  dealsApi: {
    detail: vi.fn().mockResolvedValue({
      id: 'd1',
      title: 'Internet kantor',
      currency: 'IDR',
      pipeline: { stages: [] },
    }),
  },
}))
vi.mock('@/features/catalog/api/catalog.api', () => ({
  catalogApi: { products: vi.fn().mockResolvedValue({ data: [], meta: {} }) },
}))
vi.mock('@/features/crm/contacts/api/contacts.api', () => ({
  contactsApi: {
    detail: vi.fn().mockResolvedValue({ id: 'c1', first_name: 'Budi', email: 'budi@example.com' }),
  },
}))
vi.mock('@/features/email/api/email.api', () => ({
  emailApi: { listMailboxes: vi.fn().mockResolvedValue([]) },
}))
vi.mock('@/features/whatsapp/api/whatsapp.api', () => ({
  whatsappApi: { listSessions: vi.fn().mockResolvedValue([]) },
}))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => ({ can: () => true }) }))

import QuotationEditorPage from './QuotationEditorPage.vue'

describe('QuotationEditorPage', () => {
  it('shows a sent quotation read-only with a revise action', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/crm/quotations/:id', component: QuotationEditorPage }],
    })
    get.mockResolvedValue(sentQuotation)
    await router.push('/crm/quotations/q1')
    const w = mount(QuotationEditorPage, {
      global: { plugins: [router, [VueQueryPlugin, { queryClient: new QueryClient() }]] },
    })
    await flushPromises()
    expect(w.text()).toContain('QUO-2026-0001')
    expect(w.text()).toContain('Untuk mengubah, buat revisi')
    expect(w.find('input[name="item-description"]').exists()).toBe(false)
    expect(w.text()).toContain('Buat revisi')
    expect(w.text()).toContain('Rp 111')
  })

  it('tells the user to revise when saving a draft that was sent in another tab', async () => {
    get.mockResolvedValue({ ...sentQuotation, status: 'draft', sent_at: null })
    update.mockRejectedValue({ response: { status: 409, data: { code: 'QUOTATION_LOCKED' } } })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/crm/quotations/:id', component: QuotationEditorPage }],
    })
    await router.push('/crm/quotations/q1')
    const w = mount(QuotationEditorPage, {
      global: { plugins: [router, [VueQueryPlugin, { queryClient: new QueryClient() }]] },
    })
    await flushPromises()
    await w.get('input[name="item-description"]').setValue('Internet 100 Mbps')
    const saveButton = w.findAll('button').find((b) => b.text() === 'Simpan draft')
    await saveButton!.trigger('click')
    await flushPromises()
    expect(update).toHaveBeenCalled()
    expect(w.text()).toContain('Quotation sudah terkirim. Buat revisi untuk mengubah.')
  })

  async function mountSent(status: string) {
    get.mockResolvedValue({ ...sentQuotation, status })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/crm/quotations/:id', component: QuotationEditorPage }],
    })
    await router.push('/crm/quotations/q1')
    const w = mount(QuotationEditorPage, {
      global: { plugins: [router, [VueQueryPlugin, { queryClient: new QueryClient() }]] },
    })
    await flushPromises()
    return w
  }

  it('shows the revision request banner with the customer note as plain text', async () => {
    responses.mockResolvedValue([
      {
        id: 'r1',
        action: 'revision_requested',
        categories: ['price', 'other'],
        note: '<b>terlalu mahal</b>',
        responder_name: 'Budi',
        created_at: '2026-10-05T03:00:00Z',
      },
    ])
    const w = await mountSent('revision_requested')
    const banner = w.get('[data-testid="revision-banner"]')
    expect(banner.text()).toContain('Customer meminta revisi')
    expect(banner.text()).toContain('Harga/diskon')
    expect(banner.text()).toContain('Lainnya')
    expect(banner.text()).toContain('<b>terlalu mahal</b>')
    expect(banner.find('b').exists()).toBe(false)
    expect(banner.text()).toContain('Buat revisi')
    expect(banner.text()).toContain('Tolak')
    expect(w.text()).toContain('Revisi diminta')
  })

  it('copies the public customer link of a sent quotation', async () => {
    responses.mockResolvedValue([])
    link.mockResolvedValue({ url: 'https://app.test/q/tok', expires_at: '2026-10-31T16:59:59Z' })
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const w = await mountSent('sent')
    const button = w.findAll('button').find((b) => b.text().includes('Salin link customer'))
    expect(button).toBeTruthy()
    await button!.trigger('click')
    await flushPromises()
    expect(link).toHaveBeenCalledWith('q1')
    expect(writeText).toHaveBeenCalledWith('https://app.test/q/tok')
  })
})
