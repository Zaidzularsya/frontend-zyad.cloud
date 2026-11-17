import { describe, expect, it } from 'vitest'

import { quotationErrorMessage } from './errors'

describe('quotationErrorMessage', () => {
  it('maps QUOTA_EXCEEDED on approve to the sales order quota message', () => {
    const error = { response: { status: 409, data: { code: 'QUOTA_EXCEEDED' } } }
    expect(quotationErrorMessage(error)).toBe(
      'Kuota sales order paket Anda sudah penuh. Upgrade plan untuk menambah sales order baru.',
    )
  })

  it('keeps mapped and generic messages for other errors', () => {
    expect(
      quotationErrorMessage({ response: { status: 409, data: { code: 'QUOTATION_NOT_SENT' } } }),
    ).toMatch(/terkirim/)
    expect(quotationErrorMessage(new Error('x'))).toBe('Terjadi kesalahan, silakan coba lagi.')
  })
})
