/**
 * Tautan "Lanjut chat di WhatsApp" setelah form terkirim. Aturan normalisasi nomor sama dengan
 * backend (service.NormalizeWhatsAppNumber), supaya nomor yang lolos panel juga lolos server.
 */

export const DEFAULT_WHATSAPP_MESSAGE = 'Halo, saya {nama}. Saya tertarik dengan {minat}.'
const INTEREST_FALLBACK = 'layanan Anda'
const MIN_DIGITS = 8
const MAX_DIGITS = 15

/** '' -> ''; tidak valid -> null; selain itu digit internasional tanpa '+' (0812… -> 62812…). */
export function normalizeWhatsAppNumber(raw: string): string | null {
  const cleaned = raw.trim().replace(/[\s\-()+]/g, '')
  if (cleaned === '') return ''
  if (!/^\d+$/.test(cleaned)) return null
  // Minimum dicek pada digit yang diketik, maksimum pada hasil akhir (0 -> 62 menambah satu digit).
  if (cleaned.length < MIN_DIGITS) return null
  const normalized = cleaned.startsWith('0') ? `62${cleaned.slice(1)}` : cleaned
  return normalized.length > MAX_DIGITS ? null : normalized
}

interface WhatsAppValues {
  name?: string
  interest?: string
}

export function buildWhatsAppMessage(template: string, values: WhatsAppValues): string {
  const source = template.trim() === '' ? DEFAULT_WHATSAPP_MESSAGE : template
  const name = (values.name ?? '').trim()
  const interest = (values.interest ?? '').trim() || INTEREST_FALLBACK
  return source.split('{nama}').join(name).split('{minat}').join(interest)
}

export function buildWhatsAppUrl(number: string, template: string, values: WhatsAppValues): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(buildWhatsAppMessage(template, values))}`
}
