export type ManualKind = 'settlement' | 'adjustment'
export type EntryKind = 'payment' | ManualKind

const kindLabels: Record<EntryKind, string> = {
  payment: 'Pembayaran',
  settlement: 'Setoran',
  adjustment: 'Penyesuaian',
}

export function entryKindLabel(kind: string): string {
  return kindLabels[kind as EntryKind] ?? kind
}

// Hari bisnis WIB (UTC+7), sama dengan backend.
export function todayWib(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10)
}

// Nominal tetap string desimal; tidak ada Number() agar tidak ada selisih floating point.
const AMOUNT_PATTERN = /^-?\d+(\.\d{1,2})?$/

function normalize(amount: string): string {
  const raw = amount.trim()
  const negative = raw.startsWith('-')
  const [whole = '0', frac = ''] = raw.replace(/^-/, '').split('.')
  return `${negative ? '-' : ''}${whole}.${frac.padEnd(2, '0')}`
}

function isZero(amount: string): boolean {
  return /^-?0+(\.0+)?$/.test(normalize(amount))
}

export interface EntryFormInput {
  kind: ManualKind
  amount: string
  note: string
}

// Pesan galat per form; null = valid. Aturan sama dengan backend (setoran > 0, penyesuaian boleh
// negatif tetapi tidak nol, catatan wajib untuk penyesuaian). Batas saldo hanya diputuskan server.
export function validateEntryForm(form: EntryFormInput): string | null {
  const amount = form.amount.trim()
  if (!amount) return 'Jumlah wajib diisi.'
  if (!AMOUNT_PATTERN.test(amount))
    return 'Format jumlah tidak valid (contoh: 150000 atau 150000.50).'
  if (form.kind === 'settlement') {
    if (amount.startsWith('-') || isZero(amount)) return 'Setoran harus lebih dari 0.'
    return null
  }
  if (isZero(amount)) return 'Penyesuaian tidak boleh 0.'
  if (!form.note.trim()) return 'Catatan wajib diisi untuk penyesuaian.'
  return null
}

export interface EntryPayload {
  kind: ManualKind
  amount: string
  note: string
  occurred_at: string
}

// Tanggal dipilih sebagai hari WIB; dikirim sebagai awal hari WIB dalam RFC 3339.
export function buildEntryPayload(form: EntryFormInput & { date: string }): EntryPayload {
  return {
    kind: form.kind,
    amount: normalize(form.amount),
    note: form.note.trim(),
    occurred_at: `${form.date}T00:00:00+07:00`,
  }
}

const messages: Record<string, string> = {
  SETTLEMENT_EXCEEDS_BALANCE: 'Setoran melebihi saldo yang tersisa',
  ADJUSTMENT_BELOW_ZERO: 'Penyesuaian membuat saldo kurang dari nol',
  ORGANIZATION_NOT_FOUND: 'Organisasi tidak ditemukan.',
  BENEFICIARY_NOT_CUSTOMER: 'Hanya organisasi pelanggan yang bisa menerima setoran.',
  FORBIDDEN: 'Anda tidak punya izin untuk tindakan ini.',
}

interface ErrorBody {
  code?: string
  message?: string
  error?: { code?: string }
}

export function settlementErrorMessage(
  error: unknown,
  fallback = 'Terjadi kesalahan, silakan coba lagi.',
): string {
  const body = (error as { response?: { data?: ErrorBody } } | null)?.response?.data
  const code = body?.code ?? body?.error?.code
  if (code && messages[code]) return messages[code]
  // Galat validasi dari server sudah berbahasa Indonesia dan spesifik.
  if (code === 'VALIDATION_ERROR' && body?.message) return body.message
  return fallback
}
