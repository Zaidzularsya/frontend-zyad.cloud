import { apiClient } from '@/lib/api-client'

export type FinancePartnerType = 'customer' | 'vendor'

export interface FinanceBusinessPartner {
  id: string
  partner_type: FinancePartnerType
  code: string
  name: string
  tax_id?: string
  address?: string
  control_account_id: string
  control_account_code?: string
  control_account_name?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateFinanceBusinessPartnerPayload {
  partner_type: FinancePartnerType
  code: string
  name: string
  tax_id?: string
  address?: string
  control_account_id: string
}

export interface UpdateFinanceBusinessPartnerPayload {
  name: string
  tax_id?: string
  address?: string
  is_active: boolean
}

export interface FinanceBusinessPartnerListParams {
  partner_type?: FinancePartnerType | ''
  include_inactive?: boolean
}

export const financeBusinessPartnerApi = {
  list(params: FinanceBusinessPartnerListParams = {}) {
    return apiClient.get<FinanceBusinessPartner[]>('/platform/finance/business-partners', {
      params,
    })
  },
  create(payload: CreateFinanceBusinessPartnerPayload) {
    return apiClient.post<FinanceBusinessPartner, CreateFinanceBusinessPartnerPayload>(
      '/platform/finance/business-partners',
      payload,
    )
  },
  update(id: string, payload: UpdateFinanceBusinessPartnerPayload) {
    return apiClient.put<FinanceBusinessPartner, UpdateFinanceBusinessPartnerPayload>(
      `/platform/finance/business-partners/${id}`,
      payload,
    )
  },
}
