import { describe, expect, it } from 'vitest'

import { poolCidrError } from '@/features/mikrotik/utils/cidr'

const MSG = 'Pool CIDR harus alamat jaringan privat, mis. 10.255.254.0/24'

describe('poolCidrError', () => {
  it.each(['10.255.254.0/24', '172.16.0.0/16', '192.168.10.8/29', ' 10.99.0.0/24 '])(
    'accepts %s',
    (v) => expect(poolCidrError(v)).toBe(''),
  )
  it.each([
    '',
    'abc',
    '10.0.0.1/24',
    '8.8.8.0/24',
    '10.0.0.0/8',
    '10.0.0.0/30',
    '10.0.0.256/24',
    '172.32.0.0/16',
    'fd00::/64',
  ])('rejects %s', (v) => expect(poolCidrError(v)).toBe(MSG))
})
