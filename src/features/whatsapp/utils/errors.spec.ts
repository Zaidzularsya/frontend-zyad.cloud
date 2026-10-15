import { describe, expect, it } from 'vitest'

import { whatsappErrorCode, whatsappErrorMessage } from '@/features/whatsapp/utils/errors'

const apiError = (data: unknown) => ({ response: { data } })

describe('whatsappErrorMessage', () => {
  it('maps backend codes (top-level code) to Indonesian messages', () => {
    expect(
      whatsappErrorMessage(apiError({ code: 'QUOTA_EXCEEDED', message: 'billing quota' })),
    ).toContain('Kuota nomor WhatsApp')
    expect(whatsappErrorMessage(apiError({ code: 'WHATSAPP_NOT_CONFIGURED' }))).toContain(
      'belum dikonfigurasi',
    )
  })

  it('reads a nested error.code as well', () => {
    expect(whatsappErrorCode(apiError({ error: { code: 'WHATSAPP_PROVIDER_ERROR' } }))).toBe(
      'WHATSAPP_PROVIDER_ERROR',
    )
  })

  it('falls back to the backend message, then a generic one', () => {
    expect(whatsappErrorMessage(apiError({ code: 'OTHER', message: 'Nama terlalu panjang' }))).toBe(
      'Nama terlalu panjang',
    )
    expect(whatsappErrorMessage(new Error('network'))).toBe('Terjadi kesalahan, silakan coba lagi.')
  })
})
