import { describe, expect, it } from 'vitest'

import { redirectTarget } from './redirect-target'

describe('redirectTarget', () => {
  it('classifies internal paths and http(s) urls', () => {
    expect(redirectTarget('/terima-kasih')).toEqual({ kind: 'internal', url: '/terima-kasih' })
    expect(redirectTarget(' https://example.com/x ')).toEqual({
      kind: 'external',
      url: 'https://example.com/x',
    })
    expect(redirectTarget('http://example.com')).toEqual({
      kind: 'external',
      url: 'http://example.com',
    })
  })

  it.each([
    'javascript:alert(1)',
    ' JavaScript:alert(1)',
    'data:text/html,x',
    '//evil.com',
    '/\\evil.com',
    'mailto:a@b.id',
    'tel:123',
    '',
    '   ',
    'terima-kasih',
  ])('rejects %j', (value) => {
    expect(redirectTarget(value)).toBeNull()
  })
})
