import type { SessionPurpose, SessionStatus } from '@/features/whatsapp/types'

export type StatusTone = 'success' | 'warning' | 'neutral' | 'danger'

interface StatusMeta {
  label: string
  tone: StatusTone
}

const statusMeta: Record<SessionStatus, StatusMeta> = {
  WORKING: { label: 'Terhubung', tone: 'success' },
  SCAN_QR_CODE: { label: 'Menunggu pairing', tone: 'warning' },
  STARTING: { label: 'Menyiapkan', tone: 'warning' },
  PASSKEY_REQUIRED: { label: 'Butuh verifikasi', tone: 'warning' },
  PASSKEY_CONFIRMATION_REQUIRED: { label: 'Butuh verifikasi', tone: 'warning' },
  STOPPED: { label: 'Terputus', tone: 'neutral' },
  FAILED: { label: 'Gagal', tone: 'danger' },
}

export function sessionStatusMeta(status: SessionStatus): StatusMeta {
  return statusMeta[status] ?? { label: status, tone: 'neutral' }
}

/** Waiting for the user to pair (QR or pairing code), or about to. */
export function isPairingStatus(status: SessionStatus): boolean {
  return status === 'SCAN_QR_CODE' || status === 'STARTING'
}

export const purposeLabels: Record<SessionPurpose, string> = {
  sales: 'Sales',
  cs: 'Customer service',
  notification: 'Notifikasi',
}

/**
 * Mirrors backend internal/shared/phone.NormalizeID: digits only, "00" prefix
 * dropped, leading 0 -> 62, leading 8 -> 628, valid when 8-15 digits.
 */
export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = `62${digits.slice(1)}`
  else if (digits.startsWith('8')) digits = `62${digits}`
  return digits.length >= 8 && digits.length <= 15 ? digits : null
}

/** "+62 812-3456-7890" style for display. */
export function formatPhone(normalized?: string): string {
  if (!normalized) return ''
  if (!normalized.startsWith('62')) return `+${normalized}`
  const local = normalized.slice(2)
  const groups = [local.slice(0, 3), local.slice(3, 7), local.slice(7)].filter(Boolean)
  return `+62 ${groups.join('-')}`
}
