import { describe, expect, it } from 'vitest'

import { telHref, whatsappUrl } from '@/lib/contact-links'

describe('whatsappUrl', () => {
  it.each([
    ['0812-3456-7890', 'https://wa.me/6281234567890'],
    ['+62 812-3456-7890', 'https://wa.me/6281234567890'],
    ['6281234567890', 'https://wa.me/6281234567890'],
    ['0062812-3456-7890', 'https://wa.me/6281234567890'],
    ['+0812 3456 7890', 'https://wa.me/6281234567890'],
    ['00 65 9123 4567', 'https://wa.me/6591234567'],
  ])('%s -> %s', (phone, href) => {
    expect(whatsappUrl(phone)).toBe(href)
  })

  it.each(['', '   ', '-', '+'])('empty input %j gives no link', (phone) => {
    expect(whatsappUrl(phone)).toBe('')
  })
})

describe('telHref', () => {
  it('keeps digits and plus only', () => {
    expect(telHref('+62 (812) 3456-7890')).toBe('tel:+6281234567890')
  })
})
