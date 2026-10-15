// Backend errors are {success, code, message}; some shared types nest the
// code under error.code, so both are read.
interface ErrorBody {
  code?: string
  message?: string
  error?: { code?: string }
}

const messages: Record<string, string> = {
  QUOTA_EXCEEDED:
    'Kuota nomor WhatsApp di paket Anda sudah penuh. Upgrade paket untuk menambah nomor.',
  FEATURE_NOT_ENABLED: 'Paket Anda belum mencakup fitur WhatsApp.',
  WHATSAPP_NOT_CONFIGURED:
    'Layanan WhatsApp belum dikonfigurasi di server. Hubungi admin platform.',
  WHATSAPP_PROVIDER_ERROR: 'Server WhatsApp sedang bermasalah. Coba lagi beberapa saat lagi.',
  WHATSAPP_REMOTE_SESSION_MISSING:
    'Koneksi ini sudah tidak ada di server WhatsApp. Hapus lalu hubungkan nomor lagi.',
  WHATSAPP_SESSION_NOT_SCANNING:
    'Koneksi belum siap untuk pairing. Tunggu beberapa detik atau hubungkan ulang.',
  WHATSAPP_SESSION_NOT_FOUND: 'Koneksi WhatsApp tidak ditemukan.',
  WHATSAPP_RATE_LIMITED: 'Terlalu banyak pesan dari nomor ini. Tunggu sebentar lalu kirim lagi.',
  WHATSAPP_SESSION_NOT_CONNECTED:
    'Nomor WhatsApp pengirim sedang terputus. Hubungkan ulang di halaman WhatsApp.',
  WHATSAPP_NO_CONNECTED_SESSION:
    'Belum ada nomor WhatsApp yang terhubung. Hubungkan nomor di halaman WhatsApp.',
  WHATSAPP_ENTITY_PHONE_INVALID: 'Nomor telepon lead belum valid untuk WhatsApp.',
  WHATSAPP_CONVERSATION_FORBIDDEN: 'Chat dengan lead ini dipegang user lain.',
  WHATSAPP_CONVERSATION_NOT_FOUND: 'Percakapan tidak ditemukan atau bukan milik Anda.',
  WHATSAPP_MESSAGE_NOT_RETRYABLE: 'Pesan ini tidak bisa dikirim ulang.',
}

export function whatsappErrorCode(error: unknown): string | undefined {
  const body = (error as { response?: { data?: ErrorBody } } | null)?.response?.data
  return body?.code ?? body?.error?.code
}

export function whatsappErrorMessage(error: unknown): string {
  const code = whatsappErrorCode(error)
  if (code && messages[code]) return messages[code]
  const body = (error as { response?: { data?: ErrorBody } } | null)?.response?.data
  return body?.message || 'Terjadi kesalahan, silakan coba lagi.'
}
