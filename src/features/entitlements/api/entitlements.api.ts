import { apiClient } from '@/lib/api-client'

import type { EntitlementSummaryItem } from '../types'

export const entitlementsApi = {
  summary() {
    return apiClient.get<EntitlementSummaryItem[]>('/organization/entitlements/summary')
  },
}
