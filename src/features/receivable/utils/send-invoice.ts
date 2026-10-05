import type {
  InvoiceSend,
  SendChannel,
  SendInvoicePayload,
} from '@/features/receivable/api/receivable.api'

export interface ChannelState {
  enabled: boolean
  reason?: string
}

/**
 * Urutan cek: izin → data pelanggan. Ketersediaan mailbox/session tidak dicek di sini;
 * server melaporkan alasannya (CHANNEL_UNAVAILABLE) dan dialog menampilkannya.
 */
export function invoiceChannelAvailability(ctx: {
  accountHasContact: boolean
  canEmail: boolean
  canWhatsApp: boolean
}): Record<SendChannel, ChannelState> {
  const email: ChannelState = ctx.canEmail
    ? { enabled: true }
    : { enabled: false, reason: 'Anda tidak punya izin mengirim email.' }

  let whatsapp: ChannelState = { enabled: true }
  if (!ctx.canWhatsApp)
    whatsapp = { enabled: false, reason: 'Anda tidak punya izin mengirim WhatsApp.' }
  else if (!ctx.accountHasContact)
    whatsapp = {
      enabled: false,
      reason: 'WhatsApp hanya tersedia untuk pelanggan yang terhubung ke kontak CRM.',
    }

  return { email, whatsapp }
}

/**
 * Kiriman gagal yang masih bisa di-Retry: belum disusul kiriman sukses pada kanal yang sama
 * (aturan yang sama dengan filter "Kiriman gagal" di backend).
 */
export function retryableSendIds(sends: InvoiceSend[]): Set<string> {
  const ids = new Set<string>()
  for (const failed of sends) {
    if (failed.status !== 'failed') continue
    const failedAt = Date.parse(failed.sent_at)
    const resolved = sends.some(
      (s) =>
        s.status === 'sent' && s.channel === failed.channel && Date.parse(s.sent_at) >= failedAt,
    )
    if (!resolved) ids.add(failed.id)
  }
  return ids
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: string): boolean {
  return EMAIL.test(value.trim())
}

export function buildSendPayload(
  f: { channel: SendChannel; recipient: string; message: string },
  requestId: string,
): SendInvoicePayload {
  return {
    channel: f.channel,
    client_request_id: requestId,
    recipient: f.channel === 'email' && f.recipient.trim() ? f.recipient.trim() : undefined,
    message: f.message.trim() || undefined,
  }
}
