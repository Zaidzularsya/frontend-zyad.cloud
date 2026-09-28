// Backend errors are {success, code, message}.
interface ErrorBody {
  code?: string
  message?: string
}

const messages: Record<string, string> = {
  MAILBOX_NOT_FOUND: 'Akun email tidak ditemukan.',
  MAILBOX_DUPLICATE: 'Alamat email ini sudah terhubung.',
  MAILBOX_INACTIVE: 'Akun email sedang nonaktif. Perbarui pengaturannya dulu.',
  MAILBOX_HOST_NOT_ALLOWED: 'Server email harus berupa host publik.',
  EMAIL_ENTITY_NOT_FOUND: 'Lead atau contact tujuan tidak ditemukan.',
  STORAGE_QUOTA_EXCEEDED: 'Kuota storage organisasi sudah penuh, lampiran tidak bisa disimpan.',
  FEATURE_NOT_ENABLED: 'Paket Anda belum mencakup fitur CRM.',
}

export function emailErrorMessage(error: unknown): string {
  const body =
    error && typeof error === 'object' && 'response' in error
      ? (error as { response?: { data?: ErrorBody } }).response?.data
      : undefined
  const known = body?.code ? messages[body.code] : undefined
  if (known) return known
  // Connection failures carry the mail server's own reply (e.g. "535 ...").
  if (body?.code === 'MAILBOX_CONNECTION_FAILED' && body.message) {
    return `Gagal terhubung ke server email: ${body.message.replace(/^could not connect to the mail server: /, '')}`
  }
  if (body?.message) return body.message
  return 'Terjadi kesalahan, silakan coba lagi.'
}
