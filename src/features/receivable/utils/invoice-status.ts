import type { InvoiceStatus } from '@/features/receivable/api/receivable.api'

export type StatusTone = 'gray' | 'blue' | 'green' | 'red' | 'slate'

export const INVOICE_STATUS: Record<InvoiceStatus, { label: string; tone: StatusTone }> = {
  draft: { label: 'Draft', tone: 'gray' },
  issued: { label: 'Terbit', tone: 'blue' },
  paid: { label: 'Lunas', tone: 'green' },
  overdue: { label: 'Jatuh tempo', tone: 'red' },
  void: { label: 'Dibatalkan', tone: 'slate' },
}

// Cerminan state machine backend (draft→issued→paid|overdue, void). Server tetap memvalidasi ulang;
// fungsi ini hanya menentukan tombol mana yang ditampilkan.
export const isEditable = (s: InvoiceStatus) => s === 'draft'
export const canIssue = (s: InvoiceStatus) => s === 'draft'
export const canSend = (s: InvoiceStatus) => s === 'issued' || s === 'overdue' || s === 'paid'
export const canPay = (s: InvoiceStatus) => s === 'issued' || s === 'overdue'

export function canVoid(s: InvoiceStatus, amountPaid: string): boolean {
  const hasPayments = Number(amountPaid || '0') > 0
  return !hasPayments && (s === 'draft' || s === 'issued' || s === 'overdue')
}
