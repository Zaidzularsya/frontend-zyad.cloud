// Backend errors are {success, code, message}; some shared types nest the
// code under error.code, so both are read.
interface ErrorBody {
  code?: string
  message?: string
  error?: { code?: string }
}

const messages: Record<string, string> = {
  QUOTATION_LOCKED: 'Quotation sudah terkirim. Buat revisi untuk mengubah.',
  QUOTATION_NOT_REVISABLE:
    'Revisi hanya bisa dibuat dari quotation terkirim, ditolak, atau kedaluwarsa.',
  PRODUCT_INACTIVE:
    'Ada produk yang sudah nonaktif. Hapus barisnya atau ganti menjadi baris bebas.',
  QUOTATION_DEAL_NOT_FOUND: 'Deal tidak ditemukan.',
  QUOTATION_PDF_FAILED: 'PDF tidak dapat dibuat. Coba lagi beberapa saat lagi.',
  QUOTATION_NOT_FOUND: 'Quotation tidak ditemukan atau sudah dihapus.',
  QUOTATION_NOT_SENT: 'Hanya quotation terkirim yang bisa disetujui atau ditolak.',
  VALIDATION_ERROR: 'Item belum valid. Periksa deskripsi, qty, harga, diskon, dan pajak.',
}

export function quotationErrorCode(error: unknown): string | undefined {
  const body = (error as { response?: { data?: ErrorBody } } | null)?.response?.data
  return body?.code ?? body?.error?.code
}

export function quotationErrorMessage(error: unknown): string {
  const code = quotationErrorCode(error)
  if (code && messages[code]) return messages[code]
  return 'Terjadi kesalahan, silakan coba lagi.'
}
