import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const { send } = vi.hoisted(() => ({
  send: vi.fn(),
}))
vi.mock('@/features/receivable/api/receivable.api', () => ({
  receivableApi: { invoices: { send } },
}))

import SendInvoiceDialog from './SendInvoiceDialog.vue'
import { invoiceChannelAvailability } from '@/features/receivable/utils/send-invoice'

const invoice = {
  id: 'i1',
  invoice_number: 'INV-2026-0001',
  status: 'issued',
  account: { id: 'a1', name: 'Budi', email: 'budi@example.com', phone: '', contact_id: null },
  grand_total: '333000.00',
  due_date: '2026-10-12',
  items: [],
}

const sentOk = {
  id: 's1',
  invoice_id: 'i1',
  channel: 'email',
  recipient: 'budi@example.com',
  status: 'sent',
  error: '',
}

function mountDialog(extra: Record<string, unknown> = {}) {
  return mount(SendInvoiceDialog, {
    props: {
      open: true,
      invoice: invoice as never,
      availability: invoiceChannelAvailability({
        accountHasContact: false,
        canEmail: true,
        canWhatsApp: true,
      }),
      ...extra,
    },
    global: {
      plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]],
      stubs: { teleport: true },
    },
    attachTo: document.body,
  })
}

describe('invoiceChannelAvailability', () => {
  it('disables WhatsApp without a linked CRM contact and explains why', () => {
    const a = invoiceChannelAvailability({
      accountHasContact: false,
      canEmail: true,
      canWhatsApp: true,
    })
    expect(a.email).toEqual({ enabled: true })
    expect(a.whatsapp).toEqual({
      enabled: false,
      reason: 'WhatsApp hanya tersedia untuk pelanggan yang terhubung ke kontak CRM.',
    })
  })

  it('checks permissions before data', () => {
    const a = invoiceChannelAvailability({
      accountHasContact: true,
      canEmail: false,
      canWhatsApp: false,
    })
    expect(a.email.enabled).toBe(false)
    expect(a.email.reason).toBe('Anda tidak punya izin mengirim email.')
    expect(a.whatsapp.reason).toBe('Anda tidak punya izin mengirim WhatsApp.')
    const ok = invoiceChannelAvailability({
      accountHasContact: true,
      canEmail: true,
      canWhatsApp: true,
    })
    expect(ok.whatsapp).toEqual({ enabled: true })
  })
})

describe('SendInvoiceDialog', () => {
  it('disables WhatsApp with the reason for an account without a CRM contact', async () => {
    const w = mountDialog()
    await flushPromises()
    const wa = w.get('input[value="whatsapp"]').element as HTMLInputElement
    expect(wa.disabled).toBe(true)
    expect(w.text()).toContain(
      'WhatsApp hanya tersedia untuk pelanggan yang terhubung ke kontak CRM.',
    )
    expect((w.get('input[value="email"]').element as HTMLInputElement).checked).toBe(true)
  })

  it('sends with a client request id and emits sent', async () => {
    send.mockResolvedValue(sentOk)
    const w = mountDialog()
    await flushPromises()
    await w.get('form').trigger('submit')
    await flushPromises()
    const [id, payload] = send.mock.calls[0]!
    expect(id).toBe('i1')
    expect(payload).toMatchObject({ channel: 'email', recipient: 'budi@example.com' })
    expect(payload.client_request_id).toMatch(/[0-9a-f-]{36}/)
    expect(w.emitted('sent')).toHaveLength(1)
  })

  it('preselects the channel of a failed delivery (Retry)', async () => {
    const w = mountDialog({
      availability: invoiceChannelAvailability({
        accountHasContact: true,
        canEmail: true,
        canWhatsApp: true,
      }),
      initialChannel: 'whatsapp',
    })
    await flushPromises()
    expect((w.get('input[value="whatsapp"]').element as HTMLInputElement).checked).toBe(true)
    expect(w.find('input[name="recipient"]').exists()).toBe(false)
  })

  it('keeps the dialog open on a recorded failure and retries with a NEW request id', async () => {
    send.mockReset()
    send.mockResolvedValueOnce({
      ...sentOk,
      id: 's2',
      status: 'failed',
      error: 'Belum ada pengirim.',
    })
    send.mockResolvedValueOnce(sentOk)
    const w = mountDialog()
    await flushPromises()
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Belum ada pengirim.')
    expect(w.emitted('sent')).toBeUndefined()

    const retry = w.findAll('button').find((b) => b.text() === 'Coba lagi')
    await retry!.trigger('click')
    await flushPromises()
    expect(send).toHaveBeenCalledTimes(2)
    expect(send.mock.calls[1]![1].client_request_id).not.toBe(
      send.mock.calls[0]![1].client_request_id,
    )
    expect(w.emitted('sent')).toHaveLength(1)
  })

  it('shows the server reason for an unusable channel', async () => {
    send.mockReset()
    send.mockRejectedValue({
      response: { data: { code: 'CHANNEL_UNAVAILABLE', message: 'Belum ada mailbox aktif.' } },
    })
    const w = mountDialog()
    await flushPromises()
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Belum ada mailbox aktif.')
  })

  it('blocks an invalid recipient', async () => {
    send.mockReset()
    const w = mountDialog()
    await flushPromises()
    await w.get('input[name="recipient"]').setValue('bukan email')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(send).not.toHaveBeenCalled()
    expect(w.text()).toContain('Alamat email belum valid.')
  })
})
