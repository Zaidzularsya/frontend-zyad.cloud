import { http } from '@/lib/http'
import type { ApiEnvelope, PaginatedResponse } from '@/types/api'

export interface PlatformOrganizationListParams {
  page?: number
  per_page?: number
}

export interface PlatformOrganizationSummary {
  id: string
  name: string
  slug: string
  type: string
  status: string
}

export const platformOrganizationsApi = {
  async list(params: PlatformOrganizationListParams = {}) {
    const response = await http.get<ApiEnvelope<PlatformOrganizationSummary[]>>(
      '/platform/organizations',
      { params },
    )

    return {
      data: response.data.data,
      meta: response.data.meta as PaginatedResponse<PlatformOrganizationSummary>['meta'],
    }
  },
}
