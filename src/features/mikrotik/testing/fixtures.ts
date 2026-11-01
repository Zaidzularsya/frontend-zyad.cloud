import type { PppSecret } from '@/features/mikrotik/types'

export function secret(over: Partial<PppSecret> = {}): PppSecret {
  return {
    id: 's1',
    router_id: 'r1',
    name: 'budi',
    profile: '10M',
    original_profile: '10M',
    needs_original_profile: false,
    disabled: false,
    present: true,
    isolation_state: 'normal',
    account_id: null,
    account_name: '',
    paired_at: null,
    last_seen_at: null,
    comment: '',
    suggestion: null,
    ...over,
  }
}
