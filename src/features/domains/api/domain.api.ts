import { apiClient } from '@/lib/api-client'

export type OrganizationDomainType = 'subdomain' | 'custom'

export type OrganizationDomainStatus =
  | 'pending'
  | 'pending_verification'
  | 'verified'
  | 'active'
  | 'failed'
  | 'disabled'
  | 'archived'

export type OrganizationDomainSslStatus =
  | 'pending'
  | 'provisioning'
  | 'active'
  | 'failed'
  | 'expired'
  | 'not_required'

export interface OrganizationDomain {
  id: string
  organization_id: string
  type: OrganizationDomainType
  canonical_host: string
  status: OrganizationDomainStatus
  is_primary: boolean
  verification_attempts: number
  last_verification_at?: string | null
  verified_at?: string | null
  verification_error?: string | null
  ssl_status: OrganizationDomainSslStatus
  ssl_error?: string | null
  ssl_expires_at?: string | null
  created_at: string
  updated_at: string
}

export interface OrganizationDomainChallenge {
  domain: OrganizationDomain
  challenge_type: 'dns_txt'
  record_name: string
  record_value: string
}

export interface OrganizationDomainListParams {
  search?: string
  type?: OrganizationDomainType | ''
  status?: OrganizationDomainStatus | ''
  page?: number
  per_page?: number
}

export interface CreateOrganizationDomainPayload {
  canonical_host: string
  type: OrganizationDomainType
  is_primary?: boolean
}

export const organizationDomainService = {
  list(params?: OrganizationDomainListParams) {
    return apiClient.get<OrganizationDomain[]>('/organization/domains', { params })
  },
  create(payload: CreateOrganizationDomainPayload) {
    return apiClient.post<OrganizationDomainChallenge, CreateOrganizationDomainPayload>(
      '/organization/domains',
      payload,
    )
  },
  verify(id: string) {
    return apiClient.post<OrganizationDomain>(`/organization/domains/${id}/verify`)
  },
  setPrimary(id: string) {
    return apiClient.patch<OrganizationDomain, { is_primary: true }>(
      `/organization/domains/${id}`,
      {
        is_primary: true,
      },
    )
  },
  delete(id: string) {
    return apiClient.delete<{ id: string }>(`/organization/domains/${id}`)
  },
}
