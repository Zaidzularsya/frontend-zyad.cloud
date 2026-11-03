import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  blockedTooltip,
  downloadBlob,
  exemptionLabel,
  isBlocked,
  parseBlobError,
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
    expect(exemptionLabel('2026-11-12', '2026-11-02')).toBe('Dikecualikan sampai 12 Nov 2026')
    expect(exemptionLabel(null)).toBe('')
  })

  it('hari terakhir masih aktif, sesudahnya berakhir', () => {
    expect(exemptionLabel('2026-11-02', '2026-11-02')).toBe('Dikecualikan sampai 2 Nov 2026')
    expect(exemptionLabel('2026-11-01', '2026-11-02')).toBe('Pengecualian berakhir 1 Nov 2026')
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
    vi.useFakeTimers()
    const create = vi.fn().mockReturnValue('blob:x')
    const revoke = vi.fn()
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    downloadBlob(new Blob(['a']), 'x.csv')
    expect(create).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    expect(document.querySelector('a[download]')).toBeNull()
    expect(revoke).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(revoke).toHaveBeenCalledWith('blob:x')
    click.mockRestore()
    vi.useRealTimers()
  })
})

describe('parseBlobError', () => {
  it('membaca badan JSON dari Blob agar kode galat terpetakan', async () => {
    const err = {
      response: { data: new Blob([JSON.stringify({ code: 'INTERNAL_ERROR' })]), status: 500 },
    }
    const out = (await parseBlobError(err)) as { response: { data: { code: string } } }
    expect(out.response.data.code).toBe('INTERNAL_ERROR')
  })

  it('mengembalikan galat apa adanya bila bukan Blob atau bukan JSON', async () => {
    const plain = new Error('x')
    expect(await parseBlobError(plain)).toBe(plain)
    const bad = { response: { data: new Blob(['<html>']) } }
    expect(await parseBlobError(bad)).toBe(bad)
  })
})
