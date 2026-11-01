/**
 * Berbagi link preview/pembayaran ke pelanggan lewat WhatsApp (wa.me), tanpa API pihak ketiga:
 * tombol membuka aplikasi WhatsApp dengan nomor pelanggan dan pesan yang sudah terisi.
 */

const MIN_DIGITS = 8
const MAX_DIGITS = 15 // batas E.164

/**
 * Nomor telepon bebas format → angka internasional tanpa "+" yang dipakai wa.me.
 * Awalan "0" dan "8" dianggap nomor Indonesia (62). null bila bukan nomor yang layak,
 * supaya tombol tidak membuka chat ke nomor yang salah.
 */
export function normalizeWhatsAppNumber(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const hasPlus = trimmed.startsWith('+')
  let digits = trimmed.replace(/\D/g, '')
  if (digits.length < MIN_DIGITS) return null

  if (!hasPlus) {
    if (digits.startsWith('0')) digits = `62${digits.slice(1)}`
    else if (digits.startsWith('8')) digits = `62${digits}`
  }
  return digits.length >= MIN_DIGITS && digits.length <= MAX_DIGITS ? digits : null
}

export interface ShareMessageInput {
  buyerName: string
  pageTitle: string
  previewUrl?: string
  paymentUrl?: string
}

export function buildShareMessage({
  buyerName,
  pageTitle,
  previewUrl,
  paymentUrl,
}: ShareMessageInput): string {
  const lines = [`Halo ${buyerName.trim()},`, '']
  if (previewUrl && paymentUrl) {
    lines.push(`Berikut halaman "${pageTitle}" untuk Anda.`)
  } else if (paymentUrl) {
    lines.push(`Berikut tagihan untuk halaman "${pageTitle}".`)
  } else {
    lines.push(`Berikut pratinjau halaman "${pageTitle}".`)
  }
  if (previewUrl) lines.push('', 'Lihat pratinjau halaman:', previewUrl)
  if (paymentUrl) lines.push('', 'Bayar di sini:', paymentUrl)
  lines.push('', 'Terima kasih.')
  return lines.join('\n')
}

/** URL wa.me yang menargetkan nomor pelanggan; null bila nomornya tidak valid. */
export function buildWhatsAppUrl(contact: string, message: string): string | null {
  const number = normalizeWhatsAppNumber(contact)
  if (!number) return null
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
