import type {
  ControlState,
  IsolationTask,
  PilotAccount,
  PppSecret,
  PreviewItem,
  PreviewSummary,
} from '@/features/mikrotik/types'

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

export function taskFixture(over: Partial<IsolationTask> = {}): IsolationTask {
  return {
    id: 't1',
    action: 'isolate',
    status: 'pending',
    priority: 0,
    attempts: 0,
    next_attempt_at: '2026-11-01T01:00:00Z',
    last_error_code: '',
    last_error: '',
    router: { id: 'r1', name: 'Core-1' },
    secret: { id: 's1', name: 'budi' },
    account: { id: 'a1', name: 'Budi Santoso' },
    created_at: '2026-11-01T00:00:00Z',
    finished_at: null,
    ...over,
  }
}

export function previewItem(over: Partial<PreviewItem> = {}): PreviewItem {
  return {
    account_id: 'a1',
    account_name: 'Budi Santoso',
    phone: '0812',
    status: 'will_isolate',
    overdue_days: 15,
    invoice_count: 2,
    oldest_invoice_number: 'INV-001',
    balance: '150000.00',
    router_name: 'Core-1',
    products: 'Paket 20 Mbps',
    pilot: false,
    exempted_until: null,
    ...over,
  }
}

export function previewSummary(over: Partial<PreviewSummary> = {}): PreviewSummary {
  return {
    target: 12,
    exempt: 3,
    blocked: 2,
    already_isolated: 1,
    paired_accounts: 30,
    safe: 15,
    grace_days: 0,
    cutoff: '2026-11-02',
    ...over,
  }
}

export function controlState(over: Partial<ControlState> = {}): ControlState {
  return {
    mode: 'simulation',
    grace_days: 0,
    pilot_verified_at: null,
    engine: 'on',
    effective_mode: 'simulation',
    pilot_count: 0,
    test_active_count: 0,
    isolated_secrets: 0,
    ...over,
  }
}

export function pilotAccount(over: Partial<PilotAccount> = {}): PilotAccount {
  return {
    account_id: 'a1',
    account_name: 'Budi Santoso',
    added_at: '2026-11-02T00:00:00Z',
    test_active: false,
    test_until: null,
    verified: false,
    ...over,
  }
}
