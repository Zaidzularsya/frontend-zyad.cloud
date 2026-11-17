const NUMBER = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 })

const GIB = 1024 ** 3
const MIB = 1024 ** 2

// Memori dari RouterOS dalam byte; di atas 1 GiB tampil GiB, selain itu MiB.
export function formatBytes(bytes: number): string {
  if (bytes >= GIB) return `${NUMBER.format(bytes / GIB)} GiB`
  return `${NUMBER.format(bytes / MIB)} MiB`
}

// Waktu relatif singkat ("12 detik lalu", "5 menit lalu") untuk cek terakhir dan stats.
export function relativeTime(iso: string, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return `${seconds} detik lalu`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  return `${Math.floor(hours / 24)} hari lalu`
}

const UPTIME_UNITS: Record<string, string> = {
  w: 'minggu',
  d: 'hari',
  h: 'jam',
  m: 'menit',
  s: 'detik',
}

// Uptime RouterOS berbentuk "1w2d3h4m5s"; dua satuan terbesar cukup untuk dashboard.
// Format lain ditampilkan apa adanya.
export function formatUptime(uptime: string): string {
  const parts = [...uptime.matchAll(/(\d+)([wdhms])/g)]
  if (!parts.length || parts.map((p) => p[0]).join('') !== uptime) return uptime
  return parts
    .filter((p) => p[1] !== '0')
    .slice(0, 2)
    .map((p) => `${p[1]} ${UPTIME_UNITS[p[2] ?? ''] ?? ''}`)
    .join(' ')
}
