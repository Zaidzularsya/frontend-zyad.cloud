export type EntitlementState = 'unlimited' | 'quota' | 'hidden'

export interface EntitlementSummaryItem {
  feature_key: string
  module: string
  name: string
  unit?: string
  state: EntitlementState
  limit?: number
  used?: number
  remaining?: number
  reset_strategy: 'never' | 'monthly'
  at_limit: boolean
}
