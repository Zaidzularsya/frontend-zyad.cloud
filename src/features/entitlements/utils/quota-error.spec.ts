import { describe, expect, it } from 'vitest'

import {
  isQuotaExceededError,
  quotaExceededGenericMessage,
  quotaExceededMessage,
} from './quota-error'

const apiError = (status: number, body: unknown) => ({ response: { status, data: body } })

describe('isQuotaExceededError', () => {
  it('detects the QUOTA_EXCEEDED code on HTTP 409', () => {
    expect(isQuotaExceededError(apiError(409, { code: 'QUOTA_EXCEEDED' }))).toBe(true)
  })

  it('detects the code nested under error.code', () => {
    expect(isQuotaExceededError(apiError(409, { error: { code: 'QUOTA_EXCEEDED' } }))).toBe(true)
  })

  it('ignores other 409 codes and other statuses', () => {
    expect(isQuotaExceededError(apiError(409, { code: 'PRODUCT_SKU_EXISTS' }))).toBe(false)
    expect(isQuotaExceededError(apiError(500, { code: 'QUOTA_EXCEEDED' }))).toBe(false)
  })

  it('ignores non-API errors', () => {
    expect(isQuotaExceededError(new Error('boom'))).toBe(false)
    expect(isQuotaExceededError(null)).toBe(false)
    expect(isQuotaExceededError(undefined)).toBe(false)
  })
})

describe('quotaExceededMessage', () => {
  it('builds the Indonesian message with the noun', () => {
    expect(quotaExceededMessage('lead')).toBe(
      'Kuota lead paket Anda sudah penuh. Upgrade plan untuk menambah lead baru.',
    )
  })
})

describe('quotaExceededGenericMessage', () => {
  it('builds a message without a noun', () => {
    expect(quotaExceededGenericMessage()).toBe(
      'Kuota paket Anda sudah penuh. Upgrade plan untuk menambah data baru.',
    )
  })
})
