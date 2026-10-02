// Backend errors are {success, code, message}; some shared types nest the
// code under error.code, so both are read.
interface ErrorBody {
  code?: string
  message?: string
  error?: { code?: string }
}

const messages: Record<string, string> = {
  PRODUCT_SKU_EXISTS: 'SKU sudah dipakai produk lain.',
  CATEGORY_NAME_EXISTS: 'Nama kategori sudah ada.',
  PRODUCT_NOT_FOUND: 'Produk tidak ditemukan atau sudah dihapus.',
  CATEGORY_NOT_FOUND: 'Kategori tidak ditemukan atau sudah dihapus.',
  VALIDATION_ERROR: 'Data belum valid. Periksa kembali isian Anda.',
}

export function catalogErrorMessage(error: unknown): string {
  const body = (error as { response?: { data?: ErrorBody } } | null)?.response?.data
  const code = body?.code ?? body?.error?.code
  if (code && messages[code]) return messages[code]
  return 'Terjadi kesalahan, silakan coba lagi.'
}
