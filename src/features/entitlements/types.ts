export type EntitlementState = 'unlimited' | 'quota' | 'hidden'

export interface EntitlementSummaryItem {
  feature_key: string
  module: string
  name: string
  unit?: string
  state: EntitlementState
  // Backend mengirim null (bukan menghilangkan field) bila tidak ada batas/meter.
  limit?: number | null
  used?: number | null
  remaining?: number | null
  reset_strategy: 'never' | 'monthly'
  at_limit: boolean
}
