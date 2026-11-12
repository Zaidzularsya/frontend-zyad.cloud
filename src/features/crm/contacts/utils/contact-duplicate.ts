import type { Contact, ContactRef } from '@/features/crm/contacts/api/contacts.api'

export function contactDisplayName(c: Pick<Contact, 'first_name' | 'last_name'>): string {
  return [c.first_name, c.last_name].filter(Boolean).join(' ')
}

export function toContactRef(c: Contact): ContactRef {
  return { id: c.id, name: contactDisplayName(c), email: c.email ?? '', phone: c.phone ?? '' }
}

export function normalizeEmail(raw?: string): string {
  return (raw ?? '').trim().toLowerCase()
}

/** Sama dengan normalisasi backend (phone.NormalizeID): 08…/+62 8…/8… → 628…; 8–15 digit. */
export function normalizePhone(raw?: string): string {
  let digits = (raw ?? '').replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = `62${digits.slice(1)}`
  else if (digits.startsWith('8')) digits = `62${digits}`
  return digits.length >= 8 && digits.length <= 15 ? digits : ''
}

/** Id kontak di daftar yang berbagi email atau nomor WA ternormalisasi dengan kontak lain di daftar itu. */
export function duplicateContactIds(contacts: Contact[]): Set<string> {
  const byKey = new Map<string, string[]>()
  for (const c of contacts) {
    for (const key of [`e:${normalizeEmail(c.email)}`, `p:${normalizePhone(c.phone)}`]) {
      if (key.length <= 2) continue
      byKey.set(key, [...(byKey.get(key) ?? []), c.id])
    }
  }
  const out = new Set<string>()
  for (const ids of byKey.values()) if (ids.length > 1) ids.forEach((id) => out.add(id))
  return out
}

/** Kontak lama dari galat 409 CONTACT_DUPLICATE (`data.existing`), atau null. */
export function duplicateFromError(error: unknown): ContactRef | null {
  const body = (
    error as { response?: { data?: { code?: string; data?: { existing?: ContactRef } } } }
  )?.response?.data
  if (body?.code !== 'CONTACT_DUPLICATE' || !body.data?.existing?.id) return null
  return body.data.existing
}
