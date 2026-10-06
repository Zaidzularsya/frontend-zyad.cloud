import { FIELD_MESSAGES } from '@/features/crm/sales-orders/utils/sales-order'

interface ErrorBody {
  code?: string
  message?: string
  data?: { fields?: string[] }
}

const messages: Record<string, string> = {
  SALES_ORDER_NOT_FOUND: 'Sales order tidak ditemukan.',
  SALES_ORDER_NOT_DRAFT:
    'Sales order sudah tidak berstatus draft (mungkin sudah dikonfirmasi di tab lain).',
  SALES_ORDER_NOT_CONFIRMED: 'Sales order belum dikonfirmasi.',
  DELIVERY_NOT_PENDING: 'Ada item yang sudah dikonfirmasi diterima atau tidak menunggu konfirmasi.',
  BILLING_NOT_RETRYABLE: 'Penagihan tidak sedang menunggu percobaan ulang.',
  BILLING_FAILED: 'Penagihan gagal dibuat. Coba lagi beberapa saat.',
  VALIDATION_ERROR: 'Data belum valid. Periksa isian lalu coba lagi.',
}

function body(error: unknown): ErrorBody | undefined {
  return (error as { response?: { data?: ErrorBody } } | null)?.response?.data
}

export function salesOrderErrorCode(error: unknown): string | undefined {
  return body(error)?.code
}

// SALES_ORDER_INCOMPLETE membawa daftar field; tiap field dipetakan ke pesan Indonesia.
export function salesOrderErrorMessages(error: unknown): string[] {
  const b = body(error)
  if (b?.code === 'SALES_ORDER_INCOMPLETE') {
    const fields = b.data?.fields ?? []
    const mapped = fields.flatMap((f) => (FIELD_MESSAGES[f] ? [FIELD_MESSAGES[f]] : []))
    return mapped.length > 0 ? mapped : ['Data sales order belum lengkap.']
  }
  const known = b?.code ? messages[b.code] : undefined
  if (known) return [known]
  return ['Terjadi kesalahan, silakan coba lagi.']
}
