import { describe, expect, it } from 'vitest'

import {
  routerActionError,
  secretActionError,
  taskErrorAction,
  tlsUntrustedFingerprint,
} from '@/features/mikrotik/utils/errors'

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

const err = (code: string, message = 'english server text', data?: unknown) => ({
  response: { data: { code, message, data } },
})

describe('routerActionError', () => {
  it.each([
    'MIKROTIK_TLS_UNTRUSTED',
    'MIKROTIK_TLS_REQUIRED',
    'MIKROTIK_HOST_NOT_ALLOWED',
    'MIKROTIK_SETUP_REST_UNVERIFIED',
    'MIKROTIK_AUTH_FAILED',
    'MIKROTIK_UNREACHABLE',
    'MIKROTIK_ROUTER_NOT_FOUND',
    'MIKROTIK_ROUTER_NAME_TAKEN',
    'MIKROTIK_ROUTER_HAS_ISOLATED_SECRETS',
    'MIKROTIK_SETUP_PLAN_CHANGED',
    'MIKROTIK_SETUP_IN_PROGRESS',
    'MIKROTIK_SETUP_CONFLICT',
    'MIKROTIK_SETUP_MARK_FAILED',
    'MIKROTIK_SETUP_STATE_NOT_SAVED',
    'MIKROTIK_SETUP_FAILED',
    'VALIDATION_ERROR',
    'INTERNAL_ERROR',
  ])('maps %s to Indonesian text', (code) => {
    const text = routerActionError(err(code))
    expect(text).not.toBe('')
    expect(text).not.toContain('english server text')
  })

  it('falls back to the server message for unknown codes', () => {
    expect(routerActionError(err('SOMETHING_NEW', 'pesan server'))).toBe('pesan server')
    expect(routerActionError(undefined)).toBe('Terjadi kesalahan, silakan coba lagi.')
  })
})

describe('tlsUntrustedFingerprint', () => {
  it('reads fingerprint and pin_mismatch from the error data', () => {
    expect(
      tlsUntrustedFingerprint(
        err('MIKROTIK_TLS_UNTRUSTED', 'x', { fingerprint: 'AA:BB', pin_mismatch: true }),
      ),
    ).toEqual({ fingerprint: 'AA:BB', pinMismatch: true })
  })

  it('returns null for other codes or missing data', () => {
    expect(
      tlsUntrustedFingerprint(err('MIKROTIK_AUTH_FAILED', 'x', { fingerprint: 'AA' })),
    ).toBeNull()
    expect(tlsUntrustedFingerprint(err('MIKROTIK_TLS_UNTRUSTED'))).toBeNull()
  })
})
