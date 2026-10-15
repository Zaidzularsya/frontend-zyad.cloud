import { describe, expect, it } from 'vitest'

import {
  buildSendPayload,
  channelAvailability,
  defaultOpening,
  isValidEmail,
} from './send-quotation'

describe('channelAvailability', () => {
  const base = {
    contactEmail: 'budi@example.com',
    contactPhone: '0812',
    hasActiveMailbox: true,
    hasConnectedSession: true,
    canEmail: true,
    canWhatsApp: true,
  }
  it('enables both channels when everything is ready', () => {
    expect(channelAvailability(base)).toEqual({
      email: { enabled: true },
      whatsapp: { enabled: true },
    })
  })
  it('explains why a channel is disabled', () => {
    expect(channelAvailability({ ...base, hasActiveMailbox: false }).email).toEqual({
      enabled: false,
      reason: 'Belum ada mailbox aktif. Hubungkan email di menu Email.',
    })
    expect(channelAvailability({ ...base, contactPhone: '' }).whatsapp).toEqual({
      enabled: false,
      reason: 'Kontak belum punya nomor WhatsApp.',
    })
    expect(channelAvailability({ ...base, hasConnectedSession: false }).whatsapp.reason).toBe(
      'Belum ada session WhatsApp yang tersambung.',
    )
    expect(channelAvailability({ ...base, canEmail: false }).email.reason).toBe(
      'Anda tidak punya izin mengirim email.',
    )
  })
  it('keeps email enabled without contact email (recipient can be typed)', () => {
    expect(channelAvailability({ ...base, contactEmail: '' }).email.enabled).toBe(true)
  })
})

describe('payload', () => {
  it('omits recipient for whatsapp and trims the message', () => {
    expect(
      buildSendPayload(
        {
          channel: 'whatsapp',
          mode: 'text_pdf',
          recipient: 'x',
          message: '  Halo  ',
          sessionId: 's1',
        },
        'req-1',
      ),
    ).toEqual({
      channel: 'whatsapp',
      mode: 'text_pdf',
      client_request_id: 'req-1',
      message: 'Halo',
      wa_session_id: 's1',
      recipient: undefined,
      mailbox_id: undefined,
    })
  })
  it('validates emails and builds the opening', () => {
    expect(isValidEmail('budi@example.com')).toBe(true)
    expect(isValidEmail('budi@')).toBe(false)
    expect(defaultOpening('Budi', 'QUO-1', 'PT Zyad')).toBe(
      'Halo Budi, berikut penawaran QUO-1 dari PT Zyad.',
    )
  })
})
