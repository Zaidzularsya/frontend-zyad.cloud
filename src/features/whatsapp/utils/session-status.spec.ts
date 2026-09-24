import { describe, expect, it } from 'vitest'

import {
  formatPhone,
  isPairingStatus,
  normalizePhone,
  sessionStatusMeta,
} from '@/features/whatsapp/utils/session-status'

describe('sessionStatusMeta', () => {
  it('labels every backend status', () => {
    expect(sessionStatusMeta('WORKING')).toEqual({ label: 'Terhubung', tone: 'success' })
    expect(sessionStatusMeta('SCAN_QR_CODE').tone).toBe('warning')
    expect(sessionStatusMeta('STOPPED')).toEqual({ label: 'Terputus', tone: 'neutral' })
    expect(sessionStatusMeta('FAILED')).toEqual({ label: 'Gagal', tone: 'danger' })
    expect(sessionStatusMeta('PASSKEY_REQUIRED').label).toBe('Butuh verifikasi')
  })

  it('treats STARTING and SCAN_QR_CODE as pairing', () => {
    expect(isPairingStatus('STARTING')).toBe(true)
    expect(isPairingStatus('SCAN_QR_CODE')).toBe(true)
    expect(isPairingStatus('WORKING')).toBe(false)
  })
})

describe('normalizePhone (mirrors backend phone.NormalizeID)', () => {
  it.each([
    ['0812-3456-7890', '6281234567890'],
    ['+62 812 3456 7890', '6281234567890'],
    ['62-812-3456-7890', '6281234567890'],
    ['81234567890', '6281234567890'],
    ['0062 812 3456 7890', '6281234567890'],
    ['+1 (555) 123-4567', '15551234567'],
  ])('%s -> %s', (raw, want) => {
    expect(normalizePhone(raw)).toBe(want)
  })

  it.each(['', 'abc', '0812', '+62 812 3456 7890 1234'])('rejects %j', (raw) => {
    expect(normalizePhone(raw)).toBeNull()
  })
})

describe('formatPhone', () => {
  it('groups Indonesian numbers', () => {
    expect(formatPhone('6281234567890')).toBe('+62 812-3456-7890')
    expect(formatPhone('15551234567')).toBe('+15551234567')
    expect(formatPhone(undefined)).toBe('')
  })
})
