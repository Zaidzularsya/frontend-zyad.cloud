import { describe, expect, it } from 'vitest'

import {
  addressOf,
  invalidRecipients,
  isAllowedAttachment,
  replySubject,
  splitRecipients,
} from './recipients'

describe('recipients', () => {
  it('splits on comma, semicolon and newline', () => {
    expect(splitRecipients(' a@x.com, Budi <b@y.co.id>;\n c@z.io ,')).toEqual([
      'a@x.com',
      'Budi <b@y.co.id>',
      'c@z.io',
    ])
  })

  it('extracts the address of a named recipient', () => {
    expect(addressOf('Budi <b@y.co.id>')).toBe('b@y.co.id')
    expect(addressOf('a@x.com')).toBe('a@x.com')
  })

  it('reports invalid recipients', () => {
    expect(invalidRecipients(['a@x.com', 'nope', 'Budi <b@y>'])).toEqual(['nope', 'Budi <b@y>'])
  })

  it('prefixes Re: once', () => {
    expect(replySubject('Penawaran')).toBe('Re: Penawaran')
    expect(replySubject('RE: Penawaran')).toBe('RE: Penawaran')
  })

  it('checks the attachment allow-list case-insensitively', () => {
    expect(isAllowedAttachment('Offer.DOCX')).toBe(true)
    expect(isAllowedAttachment('setup.exe')).toBe(false)
    expect(isAllowedAttachment('noextension')).toBe(false)
  })
})
