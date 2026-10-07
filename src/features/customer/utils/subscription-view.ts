import type { SubscriptionView } from '@/features/customer/api/self-serve.api'

export type BannerTone = 'success' | 'info' | 'warning' | 'danger'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

/** Tanggal kalender "YYYY-MM-DD" → "29 Okt 2026" (diurai manual agar tidak bergeser oleh zona waktu). */
export function formatDay(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return '-'
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`
}

export function isPayable(status: string): boolean {
  return status === 'issued' || status === 'overdue'
}

const INVOICE_STATUS_LABELS: Record<string, string> = {
  issued: 'Terbit',
  overdue: 'Lewat jatuh tempo',
  paid: 'Lunas',
  void: 'Dibatalkan',
}

export function invoiceStatusLabel(status: string): string {
  return INVOICE_STATUS_LABELS[status] ?? status
}

export function statusBanner(v: SubscriptionView): {
  tone: BannerTone
  title: string
  text: string
} {
  switch (v.status) {
    case 'active':
      return {
        tone: 'success',
        title: 'Aktif',
        text: v.next_invoice_date
          ? `Tagihan berikutnya terbit ${formatDay(v.next_invoice_date)}.`
          : 'Langganan Anda aktif.',
      }
    case 'awaiting_payment': {
      const open = v.invoices.find((invoice) => isPayable(invoice.status))
      return {
        tone: 'info',
        title: 'Menunggu pembayaran',
        text: open
          ? `Selesaikan pembayaran invoice ${open.number} untuk mengaktifkan paket.`
          : 'Selesaikan pembayaran invoice untuk mengaktifkan paket.',
      }
    }
    case 'overdue': {
      const left = v.suspend_in_days ?? 0
      return {
        tone: 'warning',
        title: `Tagihan lewat jatuh tempo ${v.overdue_days} hari`,
        text: `Workspace ditangguhkan ${left === 0 ? 'hari ini' : `dalam ${left} hari`} bila belum dibayar.`,
      }
    }
    default:
      return { tone: 'info', title: 'Paket Free', text: 'Pilih paket untuk membuka fitur lengkap.' }
  }
}
