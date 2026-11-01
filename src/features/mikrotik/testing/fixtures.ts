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

import type { OnboardingStatus, Router, SetupPlan } from '@/features/mikrotik/types'

export function onboarding(over: Partial<OnboardingStatus> = {}): OnboardingStatus {
  return {
    router_registered: false,
    router_ready: false,
    secrets_total: 0,
    secrets_paired: 0,
    secrets_needs_profile: 0,
    products_marked: 0,
    sender_configured: false,
    complete: false,
    ...over,
  }
}

export function routerFixture(over: Partial<Router> = {}): Router {
  return {
    id: 'r1',
    name: 'Core-1',
    host: '10.0.0.1',
    port: 8728,
    api_type: 'binary',
    use_tls: false,
    username: 'zyad',
    has_password: true,
    isolir_ready: false,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    ...over,
  }
}

export function planFixture(): SetupPlan {
  return {
    hash: 'hash-abc',
    actions: [
      {
        kind: 'ensure',
        path: '/ppp/profile',
        match: { name: 'zyad-isolir' },
        attrs: { 'local-address': '10.255.254.1' },
        note: 'profil isolir',
      },
      {
        kind: 'remove',
        path: '/ip/firewall/nat',
        match: { comment: 'zyad:redirect' },
        attrs: {},
        optional: true,
      },
    ],
  }
}
