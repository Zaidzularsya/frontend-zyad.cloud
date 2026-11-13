import { normalizeAmount } from '@/features/crm/leads/utils/convert-form'

/** One row of the "Catat tunggakan" dialog (one contract period). */
export interface ArrearsRow {
  period_start: string
  period_end: string
  amount: string
  due_date: string
  isolir_flag: boolean
}

export interface ArrearsPayload {
  account_id: string
  contract_id: string
  reason: string
  rows: { period_start: string; amount: string; due_date: string; isolir_flag: boolean }[]
}

export const MAX_ARREARS_ROWS = 24

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

/** "2026-08-05" → "5 Agu 2026" (same wording as the backend summary message). */
export function shortDateID(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${d} ${MONTHS[m - 1]} ${y}`
}

export function periodLabel(start: string, end: string): string {
  return `${shortDateID(start)} – ${shortDateID(end)}`
}

/** Today's business date in WIB (UTC+7), as the backend uses. */
export function todayWIB(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10)
}

/** "333.000" → 33300000n; null when not a valid amount (at most 2 decimals). */
function toCents(amount: string): bigint | null {
  const normalized = normalizeAmount(amount.trim())
  if (!normalized) return null
  const [whole = '0', frac = ''] = normalized.split('.')
  if (frac.length > 2) return null
  return BigInt(whole || '0') * 100n + BigInt((frac + '00').slice(0, 2))
}

function fromCents(cents: bigint): string {
  const whole = cents / 100n
  const frac = (cents % 100n).toString().padStart(2, '0')
  return `${whole}.${frac}`
}

/** Validation messages for the whole recording (empty = valid). Mirrors the backend rules. */
export function validateArrears(reason: string, rows: ArrearsRow[], today: string): string[] {
  const errors: string[] = []
  if (!reason.trim()) errors.push('Alasan wajib diisi.')
  else if ([...reason.trim()].length > 500) errors.push('Alasan maksimal 500 karakter.')
  if (rows.length === 0) errors.push('Pilih minimal satu periode.')
  if (rows.length > MAX_ARREARS_ROWS) errors.push('Maksimal 24 periode dalam satu pencatatan.')
  for (const r of rows) {
    const label = `Periode ${shortDateID(r.period_start)}`
    const cents = toCents(r.amount)
    if (cents === null || cents <= 0n) errors.push(`${label}: jumlah harus lebih dari 0.`)
    if (!r.due_date) errors.push(`${label}: jatuh tempo wajib diisi.`)
    else if (r.due_date > today) errors.push(`${label}: jatuh tempo tidak boleh setelah hari ini.`)
  }
  return errors
}

/** Sum of the valid row amounts as a 2-decimal string (bigint cents, no float drift). */
export function arrearsTotal(rows: ArrearsRow[]): string {
  let total = 0n
  for (const r of rows) {
    const cents = toCents(r.amount)
    if (cents !== null && cents > 0n) total += cents
  }
  return fromCents(total)
}

export function buildArrearsPayload(
  accountId: string,
  contractId: string,
  reason: string,
  rows: ArrearsRow[],
): ArrearsPayload {
  return {
    account_id: accountId,
    contract_id: contractId,
    reason: reason.trim(),
    rows: rows.map((r) => ({
      period_start: r.period_start,
      amount: normalizeAmount(r.amount.trim()) ?? r.amount.trim(),
      due_date: r.due_date,
      isolir_flag: r.isolir_flag,
    })),
  }
}
