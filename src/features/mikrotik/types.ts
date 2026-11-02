// Tipe diturunkan dari DTO backend (internal/modules/mikrotik/dto/*.go). Waktu berupa string ISO 8601.

export type IsolationState = 'normal' | 'isolated' | string
export type CustomerIsolationState = 'isolated' | 'normal' | 'none'
export type TaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'cancelled'
export type SuggestionFilter = 'suggested' | 'needs_decision'

export interface Router {
  id: string
  name: string
  host: string
  port: number
  api_type: string
  use_tls: boolean
  tls_fingerprint?: string
  username: string
  has_password: boolean
  isolir_ready: boolean
  isolir_ready_at?: string
  isolir_profile_name?: string
  isolir_redirect_url?: string
  last_check_at?: string
  last_check_status?: string
  routeros_version?: string
  created_at: string
  updated_at: string
}

export interface CreateRouterPayload {
  name: string
  host: string
  port: number
  username: string
  password: string
  use_tls?: boolean
  tls_fingerprint?: string
}

// Update parsial: field yang tidak dikirim tidak berubah.
export type UpdateRouterPayload = Partial<CreateRouterPayload>

export interface SetupPayload {
  profile_name?: string
  pool_cidr?: string
  rate_limit?: string
  platform_host?: string
  tenant_isolir_host?: string
  doku_hosts?: string[]
  redirect_url?: string
}

export interface ApplySetupPayload extends SetupPayload {
  plan_hash: string
}

export interface SetupAction {
  kind: string
  path: string
  match: Record<string, string>
  attrs: Record<string, string>
  optional?: boolean
  note?: string
}

export interface SetupPlan {
  hash: string
  actions: SetupAction[]
}

export type SuggestionBasis = string

export interface SecretSuggestion {
  account_id: string
  account_name: string
  account_phone: string
  /** Untuk basis "ambiguous" field account_* kosong dan candidates >= 2. */
  basis: SuggestionBasis
  candidates: number
}

export interface PppSecret {
  id: string
  router_id: string
  name: string
  profile: string
  original_profile: string
  needs_original_profile: boolean
  disabled: boolean
  present: boolean
  isolation_state: IsolationState
  account_id: string | null
  /** Hanya terisi oleh endpoint list; kosong bila belum terpasang atau akun sudah dihapus. */
  account_name: string
  paired_at: string | null
  last_seen_at: string | null
  comment: string
  suggestion: SecretSuggestion | null
}

export interface SecretListParams {
  router_id?: string
  paired?: boolean
  q?: string
  suggestion?: SuggestionFilter
  needs_original_profile?: boolean
  page?: number
  per_page?: number
}

export interface PairBulkItem {
  secret_id: string
  account_id: string
}

export interface PairBulkItemResult {
  secret_id: string
  ok: boolean
  code: string
  message: string
}

export interface PairBulkResult {
  results: PairBulkItemResult[]
}

export interface AnalyzeResult {
  total: number
  suggested: number
  needs_decision: number
}

export interface ImportResult {
  created: number
  updated: number
  missing: number
  skipped: number
}

export interface AccountRef {
  id: string
  name: string
  phone: string
  email: string
}

export interface OnboardingStatus {
  router_registered: boolean
  router_ready: boolean
  secrets_total: number
  secrets_paired: number
  secrets_needs_profile: number
  products_marked: number
  sender_configured: boolean
  complete: boolean
}

export interface CustomerStatus {
  account_id: string
  isolation_state: CustomerIsolationState
  exempt: boolean
  secrets: number
}

export interface CustomerPolicy {
  account_id: string
  exempt: boolean
  reason: string
  set_at: string | null
}

export interface SetPolicyPayload {
  exempt: boolean
  reason?: string
  // YYYY-MM-DD, inklusif (hari bisnis WIB); kosong = tanpa batas waktu.
  exempted_until?: string | null
}

export interface Product {
  id: string
  name: string
  sku: string
  recurring: boolean
  active: boolean
}

export interface ProductTrigger {
  product_id: string
  enabled: boolean
  /** Tanggal YYYY-MM-DD. */
  effective_from: string
}

export interface TriggerItem extends ProductTrigger {
  product_name: string
  product_sku: string
}

export interface TriggerPreview {
  product: Product
  active_contracts: number
  accounts: number
  overdue_invoices: number
  effective_from: string
  already_enabled: boolean
}

export interface NamedRef {
  id: string
  name: string
}

export interface IsolationTask {
  id: string
  action: string
  status: TaskStatus
  priority: number
  attempts: number
  next_attempt_at: string
  last_error_code: string
  last_error: string
  router: NamedRef
  secret: NamedRef
  account: NamedRef
  created_at: string
  finished_at: string | null
}

export interface TaskListParams {
  status?: TaskStatus
  router_id?: string
  limit?: number
  offset?: number
}

export interface TaskSummary {
  counts: Record<string, number>
  oldest_pending_restore_at: string | null
}

// ---- Pusat kendali isolir (Gelombang 2). Sumber: schema Mikrotik* di api/openapi.yaml backend.

export type IsolationMode = 'simulation' | 'pilot' | 'active' | 'paused'
export type IsolationEngine = 'off' | 'dry_run' | 'on'

export interface ControlState {
  mode: IsolationMode
  grace_days: number
  pilot_verified_at: string | null
  engine: IsolationEngine
  effective_mode: string
  pilot_count: number
  test_active_count: number
  isolated_secrets: number
}

export interface SetModeExemptions {
  account_ids: string[]
  reason: string
  // YYYY-MM-DD, inklusif; kosong = tanpa batas waktu.
  until?: string
}

export interface SetModePayload {
  mode: IsolationMode
  // Hanya diterima bersama mode 'active'.
  exemptions?: SetModeExemptions
}

export type PreviewStatus =
  | 'exempt'
  | 'no_secret'
  | 'already_isolated'
  | 'needs_profile'
  | 'secret_missing'
  | 'router_not_ready'
  | 'will_isolate'

export interface PreviewItem {
  account_id: string
  account_name: string
  phone: string
  status: PreviewStatus
  overdue_days: number
  invoice_count: number
  oldest_invoice_number: string
  // Desimal sebagai string.
  balance: string
  router_name: string
  products: string
  pilot: boolean
  exempted_until: string | null
}

export interface PreviewSummary {
  target: number
  exempt: number
  blocked: number
  already_isolated: number
  paired_accounts: number
  safe: number
  grace_days: number
  cutoff: string
}

export interface PreviewParams {
  status?: PreviewStatus
  q?: string
  page?: number
  per_page?: number
}

export interface PilotAccount {
  account_id: string
  account_name: string
  added_at: string
  test_active: boolean
  test_until: string | null
  verified: boolean
}

export interface PilotTest {
  test_until: string
}

export interface RestoreAllResult {
  enqueued: number
  skipped: number
  failed: number
  aborted: boolean
}

export interface ActivityItem {
  id: string
  at: string
  event: string
  actor_user_id: string
  account_id: string
  account_name: string
  secret_name: string
  message: string
}

export interface ActivityParams {
  limit?: number
  offset?: number
}

export interface ActivityMeta {
  limit: number
  offset: number
  total: number
}
