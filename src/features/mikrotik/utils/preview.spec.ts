import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  blockedTooltip,
  downloadBlob,
  exemptionLabel,
  isBlocked,
  statusLabel,
  wibToday,
} from '@/features/mikrotik/utils/preview'

describe('statusLabel', () => {
  it('memberi label dan tone untuk tiap status', () => {
    expect(statusLabel('will_isolate')).toEqual({ text: 'Siap diisolir', tone: 'ok' })
    expect(statusLabel('secret_missing').text).toBe('Secret tidak ditemukan di router')
    expect(statusLabel('secret_missing').tone).toBe('danger')
    expect(statusLabel('exempt').tone).toBe('neutral')
  })
})

describe('isBlocked / blockedTooltip', () => {
  it('menandai empat status yang tidak bisa diisolir', () => {
    for (const s of ['secret_missing', 'no_secret', 'needs_profile', 'router_not_ready'] as const) {
      expect(isBlocked(s)).toBe(true)
    }
    for (const s of ['will_isolate', 'exempt', 'already_isolated'] as const) {
      expect(isBlocked(s)).toBe(false)
    }
  })

  it('tooltip persis sesuai spec', () => {
    expect(blockedTooltip('secret_missing')).toBe(
      'Tidak bisa diisolir. Secret tidak ditemukan di router. Perbaiki pemetaan di Akun PPPoE.',
    )
  })
})

describe('exemptionLabel', () => {
  it('menampilkan tanggal WIB atau kosong', () => {
    expect(exemptionLabel('2026-11-12')).toBe('Dikecualikan sampai 12 Nov 2026')
    expect(exemptionLabel(null)).toBe('')
  })
})

describe('wibToday', () => {
  afterEach(() => vi.useRealTimers())
  it('memakai hari kalender WIB, bukan UTC', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-01T18:30:00Z')) // 02 Nov 01:30 WIB
    expect(wibToday()).toBe('2026-11-02')
  })
})

describe('downloadBlob', () => {
  it('memakai object URL, tautan sementara, lalu mencabut URL', () => {
    const create = vi.fn().mockReturnValue('blob:x')
    const revoke = vi.fn()
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    downloadBlob(new Blob(['a']), 'x.csv')
    expect(create).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    expect(revoke).toHaveBeenCalledWith('blob:x')
    expect(document.querySelector('a[download]')).toBeNull()
    click.mockRestore()
  })
})
