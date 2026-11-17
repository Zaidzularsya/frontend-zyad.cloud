import type { PreviewStatus } from '@/features/mikrotik/types'

export type StatusTone = 'ok' | 'neutral' | 'danger'

const STATUS_LABELS: Record<PreviewStatus, { text: string; tone: StatusTone }> = {
  will_isolate: { text: 'Siap diisolir', tone: 'ok' },
  exempt: { text: 'Dikecualikan', tone: 'neutral' },
  already_isolated: { text: 'Sudah terisolir', tone: 'neutral' },
  no_secret: { text: 'Belum ada secret terpasang', tone: 'danger' },
  secret_missing: { text: 'Secret tidak ditemukan di router', tone: 'danger' },
  needs_profile: { text: 'Perlu profile asal', tone: 'danger' },
  router_not_ready: { text: 'Router belum siap isolir', tone: 'danger' },
}

export function statusLabel(status: PreviewStatus): { text: string; tone: StatusTone } {
  return STATUS_LABELS[status]
}

// Status yang tidak mungkin diisolir mesin sampai pemetaan di Akun PPPoE diperbaiki.
const BLOCKED: readonly PreviewStatus[] = [
  'secret_missing',
  'no_secret',
  'needs_profile',
  'router_not_ready',
]

export function isBlocked(status: PreviewStatus): boolean {
  return BLOCKED.includes(status)
}

export function blockedTooltip(status: PreviewStatus): string {
  return `Tidak bisa diisolir. ${STATUS_LABELS[status].text}. Perbaiki pemetaan di Akun PPPoE.`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

// `YYYY-MM-DD` adalah tanggal kalender WIB; diformat tanpa konversi zona waktu.
export function formatDateId(date: string): string {
  const [y, m, d] = date.split('-')
  const month = MONTHS[Number(m) - 1]
  return month ? `${Number(d)} ${month} ${y}` : date
}

export function isExpired(until: string | null, today: string = wibToday()): boolean {
  return Boolean(until) && (until as string) < today
}

export function exemptionLabel(until: string | null, today: string = wibToday()): string {
  if (!until) return ''
  return isExpired(until, today)
    ? `Pengecualian berakhir ${formatDateId(until)}`
    : `Dikecualikan sampai ${formatDateId(until)}`
}

const wibDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// Hari ini menurut WIB (YYYY-MM-DD), sama dengan batas validasi backend.
export function wibToday(): string {
  return wibDate.format(new Date())
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  try {
    a.click()
  } finally {
    a.remove()
    // Ditunda agar unduhan sempat dimulai sebelum URL dicabut.
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

// Galat responseType 'blob' membawa badan JSON sebagai Blob; ubah kembali agar pemetaan
// galat yang ada (response.data.code/message) tetap bisa membacanya.
export async function parseBlobError(error: unknown): Promise<unknown> {
  const response = (error as { response?: { data?: unknown } } | undefined)?.response
  if (!response || !(response.data instanceof Blob)) return error
  try {
    const parsed = JSON.parse(await readBlobText(response.data)) as unknown
    return { ...(error as object), response: { ...response, data: parsed } }
  } catch {
    return error
  }
}
