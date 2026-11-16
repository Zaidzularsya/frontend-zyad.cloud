import { describe, expect, it } from 'vitest'

import type { SetupAction } from '@/features/mikrotik/types'
import { setupActionTitle } from '@/features/mikrotik/utils/setup-action-label'

const a = (path: string, match: Record<string, string> = {}): SetupAction => ({
  kind: 'create',
  path,
  match,
  attrs: {},
})

describe('setupActionTitle', () => {
  it.each([
    ['/ppp/profile', {}, 'Profile isolir'],
    ['/ip/pool', {}, 'IP pool isolir'],
    ['/ip/firewall/nat', {}, 'Aturan NAT redirect'],
    ['/ip/proxy/access', {}, 'Aturan proxy redirect'],
    ['/ip/firewall/address-list', { list: 'zyad-allow' }, 'Address list: zyad-allow'],
    [
      '/ip/firewall/address-list',
      { list: 'zyad-allow', address: 'a.id' },
      'Address list: zyad-allow (a.id)',
    ],
    ['/ip/firewall/filter', { comment: 'zyad:F1', chain: 'forward' }, 'Aturan firewall: zyad:F1'],
    ['/ip/firewall/filter', { chain: 'forward' }, 'Aturan firewall: forward'],
    ['/ip/address', {}, '/ip/address'],
  ])('%s %j -> %s', (path, match, title) => {
    expect(setupActionTitle(a(path, match))).toBe(title)
  })
})
