/**
 * wa.me butuh format internasional tanpa tanda (digit saja). Awalan `00` adalah
 * kode akses internasional (dibuang); awalan `0` (termasuk `+0…` yang salah ketik)
 * adalah nomor lokal Indonesia -> `62`.
 */
export function whatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  let intl = digits
  if (digits.startsWith('00')) intl = digits.slice(2)
  else if (digits.startsWith('0')) intl = `62${digits.slice(1)}`
  return intl ? `https://wa.me/${intl}` : ''
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
