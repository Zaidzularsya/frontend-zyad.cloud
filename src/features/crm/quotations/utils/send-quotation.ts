import type {
  SendChannel,
  SendMode,
  SendQuotationPayload,
} from '@/features/crm/quotations/api/quotations.api'

export interface ChannelContext {
  contactEmail?: string
  contactPhone?: string
  hasActiveMailbox: boolean
  hasConnectedSession: boolean
  canEmail: boolean
  canWhatsApp: boolean
}

export interface ChannelState {
  enabled: boolean
  reason?: string
}

/** Urutan cek: izin → mailbox/session → data kontak. Server tetap memvalidasi ulang. */
export function channelAvailability(ctx: ChannelContext): Record<SendChannel, ChannelState> {
  let email: ChannelState = { enabled: true }
  if (!ctx.canEmail) email = { enabled: false, reason: 'Anda tidak punya izin mengirim email.' }
  else if (!ctx.hasActiveMailbox)
    email = { enabled: false, reason: 'Belum ada mailbox aktif. Hubungkan email di menu Email.' }

  let whatsapp: ChannelState = { enabled: true }
  if (!ctx.canWhatsApp)
    whatsapp = { enabled: false, reason: 'Anda tidak punya izin mengirim WhatsApp.' }
  else if (!ctx.hasConnectedSession)
    whatsapp = { enabled: false, reason: 'Belum ada session WhatsApp yang tersambung.' }
  else if (!ctx.contactPhone?.trim())
    whatsapp = { enabled: false, reason: 'Kontak belum punya nomor WhatsApp.' }

  return { email, whatsapp }
}

export function defaultOpening(contactName: string, number: string, issuer?: string): string {
  const name = contactName.trim() || 'Bapak/Ibu'
  return `Halo ${name}, berikut penawaran ${number}${issuer ? ` dari ${issuer}` : ''}.`
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(v: string): boolean {
  return EMAIL.test(v.trim())
}

export function buildSendPayload(
  f: {
    channel: SendChannel
    mode: SendMode
    recipient: string
    message: string
    mailboxId?: string
    sessionId?: string
  },
  requestId: string,
): SendQuotationPayload {
  const isEmail = f.channel === 'email'
  return {
    channel: f.channel,
    mode: f.mode,
    client_request_id: requestId,
    recipient: isEmail && f.recipient.trim() ? f.recipient.trim() : undefined,
    message: f.message.trim() || undefined,
    mailbox_id: isEmail ? f.mailboxId || undefined : undefined,
    wa_session_id: isEmail ? undefined : f.sessionId || undefined,
  }
}
