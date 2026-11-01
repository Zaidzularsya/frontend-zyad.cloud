import { describe, expect, it } from 'vitest'

import { secretActionError, taskErrorAction } from '@/features/mikrotik/utils/errors'

const KNOWN_CODES = [
  'auth_failed',
  'tls_untrusted',
  'host_not_allowed',
  'secret_missing',
  'profile_missing',
  'restore_target_invalid',
  'router_not_found',
  'router_not_ready',
  'router_unverifiable',
  'unreachable',
  'unknown',
]

describe('taskErrorAction', () => {
  it.each(KNOWN_CODES)('memberi pesan dan aksi non-kosong untuk %s', (code) => {
    const result = taskErrorAction(code)
    expect(result.message.trim()).not.toBe('')
    expect(result.action.trim()).not.toBe('')
  })

  it('kode tak dikenal jatuh ke unknown', () => {
    expect(taskErrorAction('kode_ngawur')).toEqual(taskErrorAction('unknown'))
    expect(taskErrorAction('')).toEqual(taskErrorAction('unknown'))
  })

  it('tiap kode dikenal punya pesan berbeda', () => {
    const messages = new Set(KNOWN_CODES.map((c) => taskErrorAction(c).message))
    expect(messages.size).toBe(KNOWN_CODES.length)
  })
})

describe('secretActionError', () => {
  it('maps 409 codes to readable messages', () => {
    expect(
      secretActionError({ response: { data: { code: 'MIKROTIK_SECRET_HAS_ACTIVE_TASK' } } }),
    ).toContain('tugas isolir')
    expect(
      secretActionError({ response: { data: { error: { code: 'MIKROTIK_SECRET_ISOLATED' } } } }),
    ).toContain('terisolir')
  })

  it('falls back to backend message then generic', () => {
    expect(secretActionError({ response: { data: { message: 'x salah' } } })).toBe('x salah')
    expect(secretActionError(new Error('net'))).toBe('Terjadi kesalahan, silakan coba lagi.')
  })
})
