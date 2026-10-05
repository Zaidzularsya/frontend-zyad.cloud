// Galat backend berbentuk {success, code, message}; sebagian tipe bersama menaruh kode di error.code.
interface ErrorBody {
  code?: string
  message?: string
  error?: { code?: string }
}

const messages: Record<string, string> = {
  INVOICE_NOT_FOUND: 'Invoice tidak ditemukan.',
  ACCOUNT_NOT_FOUND: 'Pelanggan tidak ditemukan.',
  INVOICE_NOT_DRAFT: 'Invoice sudah diterbitkan dan tidak bisa diubah.',
  INVOICE_NOT_SENDABLE: 'Invoice dengan status ini tidak bisa dikirim.',
  INVOICE_NOT_PAYABLE: 'Status invoice tidak mengizinkan tindakan ini.',
  INVOICE_HAS_PAYMENTS: 'Invoice sudah punya pembayaran dan tidak bisa dibatalkan.',
  PAYMENT_EXCEEDS_BALANCE: 'Jumlah pembayaran melebihi sisa tagihan.',
  INVOICE_PDF_FAILED: 'PDF tidak dapat dibuat. Coba lagi beberapa saat lagi.',
  FORBIDDEN: 'Anda tidak punya izin untuk tindakan ini.',
}

// Pesan server untuk kode ini sudah berbahasa Indonesia dan spesifik, jadi dipakai apa adanya.
const serverMessageCodes = new Set(['VALIDATION_ERROR', 'CHANNEL_UNAVAILABLE'])

function body(error: unknown): ErrorBody | undefined {
  return (error as { response?: { data?: ErrorBody } } | null)?.response?.data
}

export function receivableErrorCode(error: unknown): string | undefined {
  const b = body(error)
  return b?.code ?? b?.error?.code
}

export function receivableErrorMessage(
  error: unknown,
  fallback = 'Terjadi kesalahan, silakan coba lagi.',
): string {
  const code = receivableErrorCode(error)
  if (code && serverMessageCodes.has(code) && body(error)?.message)
    return body(error)!.message as string
  if (code && messages[code]) return messages[code]
  return fallback
}
