import { describe, expect, it } from 'vitest'

import {
  duplicateContactIds,
  duplicateFromError,
  normalizePhone,
} from '@/features/crm/contacts/utils/contact-duplicate'
import type { Contact } from '@/features/crm/contacts/api/contacts.api'

const c = (id: string, email = '', phone = '') => ({ id, first_name: id, email, phone }) as Contact

describe('contact-duplicate', () => {
  it('menormalkan nomor seperti backend', () => {
    for (const raw of ['0812-3456-7890', '+62 812 3456 7890', '6281234567890', '81234567890'])
      expect(normalizePhone(raw)).toBe('6281234567890')
    expect(normalizePhone('123')).toBe('')
  })
  it('menandai email beda huruf dan nomor beda format', () => {
    const ids = duplicateContactIds([
      c('a', 'A@b.com'),
      c('b', ' a@b.com '),
      c('x', '', '0812 3456 7890'),
      c('y', '', '+62 812-3456-7890'),
      c('z', 'z@b.com', '0899 0000 0000'),
    ])
    expect([...ids].sort()).toEqual(['a', 'b', 'x', 'y'])
  })
  it('membaca kontak lama dari galat CONTACT_DUPLICATE', () => {
    const existing = { id: 'c1', name: 'Budi', email: '', phone: '' }
    expect(
      duplicateFromError({ response: { data: { code: 'CONTACT_DUPLICATE', data: { existing } } } }),
    ).toEqual(existing)
    expect(duplicateFromError({ response: { data: { code: 'QUOTA_EXCEEDED' } } })).toBeNull()
  })
})
