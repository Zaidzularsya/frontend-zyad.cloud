import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { PublicQuotation } from '../api/public-quotation.api'

const { get, approve, revision } = vi.hoisted(() => ({
  get: vi.fn(),
  approve: vi.fn(),
  revision: vi.fn(),
}))
vi.mock('../api/public-quotation.api', () => ({
  publicQuotationApi: {
    get,
    approve,
    revision,
    pdfUrl: (t: string) => `/api/v1/public/quotations/${t}/pdf`,
  },
}))

import PublicQuotationPage from './PublicQuotationPage.vue'

function quotation(over: Partial<PublicQuotation> = {}): PublicQuotation {
  return {
    tenant_name: 'PT Zyad',
    quotation_number: 'QUO-2026-0001',
    status: 'sent',
    state: 'active',
    valid_until: '2026-10-31T00:00:00Z',
    currency: 'IDR',
    grand_total: '111000.00',
    one_time_total: '111000.00',
    first_invoice_total: '111000.00',
    recurring_totals: {},
    items: [
      {
        description: '<script>alert(1)</script> Internet',
        quantity: '1.00',
        unit_price: '100000.00',
        line_total: '100000.00',
      },
    ],
    last_response: null,
    ...over,
  }
}

async function mountPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/q/:token', component: PublicQuotationPage }],
  })
  await router.push('/q/tok123')
  const wrapper = mount(PublicQuotationPage, {
    attachTo: document.body,
    global: {
      plugins: [
        router,
        [
          VueQueryPlugin,
          { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        ],
      ],
    },
  })
  await flushPromises()
  return wrapper
}

function button(wrapper: Awaited<ReturnType<typeof mountPage>>, label: string) {
  return wrapper.findAll('button').find((b) => b.text().includes(label))
}

describe('PublicQuotationPage', () => {
  beforeEach(() => {
    get.mockReset()
    approve.mockReset()
    revision.mockReset()
    document.body.innerHTML = ''
  })

  it('offers approve and revision actions while the quotation is active', async () => {
    get.mockResolvedValue(quotation())
    const wrapper = await mountPage()
    expect(get).toHaveBeenCalledWith('tok123')
    expect(button(wrapper, 'Setujui')).toBeTruthy()
    expect(button(wrapper, 'Minta revisi')).toBeTruthy()
    expect(wrapper.text()).toContain('PT Zyad')
    expect(wrapper.text()).toContain('QUO-2026-0001')
  })

  it('renders item text literally instead of interpreting HTML', async () => {
    get.mockResolvedValue(quotation())
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('<script>alert(1)</script> Internet')
    expect(wrapper.find('script').exists()).toBe(false)
  })

  it('tells the customer a newer version exists and hides the actions', async () => {
    get.mockResolvedValue(quotation({ state: 'superseded', status: 'superseded' }))
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('Penawaran ini sudah diperbarui')
    expect(button(wrapper, 'Setujui')).toBeUndefined()
    expect(button(wrapper, 'Minta revisi')).toBeUndefined()
  })

  it('hides the actions when expired', async () => {
    get.mockResolvedValue(quotation({ state: 'expired' }))
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('melewati masa berlaku')
    expect(button(wrapper, 'Setujui')).toBeUndefined()
  })

  it('confirms a recorded revision request', async () => {
    get.mockResolvedValue(
      quotation({
        state: 'decided',
        status: 'revision_requested',
        last_response: {
          action: 'revision_requested',
          responder_name: 'Budi',
          categories: ['price', 'other'],
          created_at: '2026-10-05T03:00:00Z',
        },
      }),
    )
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('Permintaan revisi Anda sudah kami terima')
    expect(wrapper.text()).toContain('Harga/diskon')
    expect(button(wrapper, 'Setujui')).toBeUndefined()
  })

  it('shows the invalid-link screen on 404', async () => {
    get.mockRejectedValue({ response: { status: 404, data: { code: 'LINK_INVALID' } } })
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('Link tidak valid atau sudah tidak berlaku.')
  })

  it('submits approval once even when clicked twice', async () => {
    get.mockResolvedValue(quotation())
    let resolve!: (v: PublicQuotation) => void
    approve.mockReturnValue(new Promise<PublicQuotation>((r) => (resolve = r)))
    const wrapper = await mountPage()

    await button(wrapper, 'Setujui')!.trigger('click')
    const dialog = document.body
    const name = dialog.querySelector('input[name="responder_name"]') as HTMLInputElement
    name.value = 'Budi Santoso'
    name.dispatchEvent(new Event('input'))
    const agree = dialog.querySelector('input[type="checkbox"]') as HTMLInputElement
    agree.click()
    await flushPromises()

    const submit = [...dialog.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Setujui penawaran'),
    ) as HTMLButtonElement
    submit.click()
    submit.click()
    await flushPromises()
    expect(approve).toHaveBeenCalledTimes(1)
    expect(approve).toHaveBeenCalledWith('tok123', { responder_name: 'Budi Santoso', agree: true })

    get.mockResolvedValue(quotation({ state: 'decided', status: 'approved' }))
    resolve(quotation({ state: 'decided', status: 'approved' }))
    await flushPromises()
    expect(wrapper.text()).toContain('Terima kasih')
  })

  it('shows the submitted note as plain text after a revision request', async () => {
    get.mockResolvedValue(quotation())
    revision.mockResolvedValue(quotation({ state: 'decided', status: 'revision_requested' }))
    const wrapper = await mountPage()

    await button(wrapper, 'Minta revisi')!.trigger('click')
    const dialog = document.body
    const name = dialog.querySelector('input[name="responder_name"]') as HTMLInputElement
    name.value = 'Budi'
    name.dispatchEvent(new Event('input'))
    ;(dialog.querySelector('input[value="price"]') as HTMLInputElement).click()
    const note = dialog.querySelector('textarea') as HTMLTextAreaElement
    note.value = '<script>x</script>'
    note.dispatchEvent(new Event('input'))
    await flushPromises()
    ;[...dialog.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Kirim permintaan revisi'))!
      .click()
    await flushPromises()

    expect(revision).toHaveBeenCalledWith('tok123', {
      responder_name: 'Budi',
      categories: ['price'],
      note: '<script>x</script>',
    })
    expect(document.body.textContent).toContain('<script>x</script>')
    expect(document.body.querySelector('script')).toBeNull()
  })
})
