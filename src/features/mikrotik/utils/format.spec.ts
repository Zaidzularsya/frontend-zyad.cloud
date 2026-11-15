import { describe, expect, it } from 'vitest'

import { formatBytes, formatUptime, relativeTime } from '@/features/mikrotik/utils/format'

describe('format', () => {
  it('formats bytes as GiB or MiB', () => {
    expect(formatBytes(4 * 1024 ** 3)).toBe('4 GiB')
    expect(formatBytes(1.5 * 1024 ** 3)).toBe('1,5 GiB')
    expect(formatBytes(512 * 1024 ** 2)).toBe('512 MiB')
  })

  it('formats relative time', () => {
    const now = Date.parse('2026-11-16T10:00:00Z')
    expect(relativeTime('2026-11-16T09:59:48Z', now)).toBe('12 detik lalu')
    expect(relativeTime('2026-11-16T09:55:00Z', now)).toBe('5 menit lalu')
    expect(relativeTime('2026-11-16T07:00:00Z', now)).toBe('3 jam lalu')
    expect(relativeTime('2026-11-14T10:00:00Z', now)).toBe('2 hari lalu')
  })

  it('formats RouterOS uptime with its two largest units', () => {
    expect(formatUptime('1w2d3h4m5s')).toBe('1 minggu 2 hari')
    expect(formatUptime('3h0m12s')).toBe('3 jam 12 detik')
    expect(formatUptime('00:12:00')).toBe('00:12:00')
  })
})
