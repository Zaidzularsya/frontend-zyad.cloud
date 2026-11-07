/** wa.me butuh format internasional tanpa tanda: digit saja, awalan 0 -> 62. */
export function whatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  return `https://wa.me/${digits.startsWith('0') ? `62${digits.slice(1)}` : digits}`
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
