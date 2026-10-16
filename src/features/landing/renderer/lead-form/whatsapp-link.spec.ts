import { describe, expect, it } from 'vitest'

import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  DEFAULT_WHATSAPP_MESSAGE,
  normalizeWhatsAppNumber,
} from './whatsapp-link'

describe('normalizeWhatsAppNumber', () => {
  it('normalizes whatsapp number like the server', () => {
    expect(normalizeWhatsAppNumber('0812-3456-7890')).toBe('6281234567890')
    expect(normalizeWhatsAppNumber('+62 812 3456 7890')).toBe('6281234567890')
    expect(normalizeWhatsAppNumber('(021) 555 1234')).toBe('62215551234')
    expect(normalizeWhatsAppNumber('0812345')).toBeNull()
    expect(normalizeWhatsAppNumber('08x1234567890')).toBeNull()
    expect(normalizeWhatsAppNumber('08123456789012345678')).toBeNull()
    expect(normalizeWhatsAppNumber('')).toBe('')
    expect(normalizeWhatsAppNumber('   ')).toBe('')
  })
})

describe('buildWhatsAppMessage', () => {
  it('fills {nama} and {minat}, falling back to "layanan Anda"', () => {
    expect(
      buildWhatsAppMessage('Hai {nama}, soal {minat}', { name: 'Budi', interest: 'Paket 20' }),
    ).toBe('Hai Budi, soal Paket 20')
    expect(buildWhatsAppMessage('Soal {minat}', { name: 'Budi' })).toBe('Soal layanan Anda')
    expect(buildWhatsAppMessage('Soal {minat}', { interest: '  ' })).toBe('Soal layanan Anda')
  })

  it('uses the default template when empty', () => {
    expect(DEFAULT_WHATSAPP_MESSAGE).toBe('Halo, saya {nama}. Saya tertarik dengan {minat}.')
    expect(buildWhatsAppMessage('', { name: 'Budi' })).toBe(
      'Halo, saya Budi. Saya tertarik dengan layanan Anda.',
    )
    expect(buildWhatsAppMessage('  ', { name: 'Budi', interest: 'X' })).toBe(
      'Halo, saya Budi. Saya tertarik dengan X.',
    )
  })

  it('does not interpret replacement patterns in visitor input', () => {
    expect(buildWhatsAppMessage('{nama}', { name: '$& $1' })).toBe('$& $1')
  })
})

describe('buildWhatsAppUrl', () => {
  it('encodes the message in the wa.me url', () => {
    const url = buildWhatsAppUrl('6281234567890', 'Saya {nama}', { name: 'Budi & Sons' })
    expect(url).toBe('https://wa.me/6281234567890?text=Saya%20Budi%20%26%20Sons')
  })
})
