import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const { sendVia } = vi.hoisted(() => ({
  sendVia: vi.fn().mockResolvedValue({
    quotation: { id: 'q1', status: 'sent' },
    send: { id: 's1', status: 'sent', channel: 'email', recipient: 'budi@example.com' },
  }),
}))
vi.mock('@/features/crm/quotations/api/quotations.api', () => ({
  quotationsApi: {
    sendVia,
    summary: vi.fn().mockResolvedValue({
      subject: 'Penawaran QUO-1',
      text: 'Halo Budi\n*Total: Rp 111*',
      html: '',
    }),
  },
}))

import SendQuotationDialog from './SendQuotationDialog.vue'

const props = {
  open: true,
  quotation: { id: 'q1', quotation_number: 'QUO-1', status: 'draft', items: [] },
  contact: { id: 'c1', first_name: 'Budi', email: 'budi@example.com', phone: '' },
  availability: {
    email: { enabled: true },
    whatsapp: { enabled: false, reason: 'Kontak belum punya nomor WhatsApp.' },
  },
}

describe('SendQuotationDialog', () => {
  it('disables WhatsApp with a reason and previews the summary', async () => {
    const w = mount(SendQuotationDialog, {
      props: props as never,
      global: {
        plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]],
        stubs: { teleport: true },
      },
      attachTo: document.body,
    })
    await flushPromises()
    const wa = w.get('input[value="whatsapp"]').element as HTMLInputElement
    expect(wa.disabled).toBe(true)
    expect(w.text()).toContain('Kontak belum punya nomor WhatsApp.')
    expect(w.text()).toContain('*Total: Rp 111*')
  })

  it('sends with a stable client request id and emits sent', async () => {
    const w = mount(SendQuotationDialog, {
      props: props as never,
      global: {
        plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]],
        stubs: { teleport: true },
      },
      attachTo: document.body,
    })
    await flushPromises()
    await w.get('form').trigger('submit')
    await flushPromises()
    const [, payload] = sendVia.mock.calls[0]!
    expect(payload).toMatchObject({
      channel: 'email',
      mode: 'text_pdf',
      recipient: 'budi@example.com',
    })
    expect(payload.client_request_id).toMatch(/[0-9a-f-]{36}/)
    expect(w.emitted('sent')).toHaveLength(1)
  })
})
