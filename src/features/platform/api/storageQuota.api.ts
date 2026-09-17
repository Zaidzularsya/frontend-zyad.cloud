import { http } from '@/lib/http'
import type { ApiEnvelope } from '@/types/api'

export interface OrganizationStorageUsage {
  used_bytes: number
  limit_bytes?: number | null
}

const STORAGE_FEATURE_KEY = 'storage.max_bytes'

async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const response = await promise
  return response.data.data
}

export const storageQuotaApi = {
  getUsage: (organizationId: string) =>
    unwrap<OrganizationStorageUsage>(
      http.get(`/platform/organizations/${organizationId}/storage-usage`),
    ),

  // Reuse the existing entitlement-override endpoint (feature_key
  // storage.max_bytes) — there's no dedicated "set storage quota" endpoint,
  // the generic entitlement mechanism already covers it.
  setQuota: (organizationId: string, limitBytes: number) =>
    unwrap(
      http.patch(`/platform/organizations/${organizationId}/entitlements`, {
        feature_key: STORAGE_FEATURE_KEY,
        source: 'platform_override',
        status: 'active',
        limits: { limit: limitBytes },
        reason: 'Storage quota set by platform admin',
      }),
    ),
}
