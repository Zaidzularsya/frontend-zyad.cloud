import { http } from '@/lib/http'

import type {
  ActivationInvoicePayload,
  ActivationResult,
} from '@/features/landing/activation/utils/activation-state'
import type {
  ActivationInvoiceFilter,
  ActivationInvoicesPage,
  RenewPayload,
} from '@/features/landing/activation/utils/activation-invoices'

interface Envelope<T> {
  success: boolean
  message?: string
  data: T
}

export const activationApi = {
  // preview_url hanya dikembalikan di response ini (token mentah): jangan disimpan di mana pun.
  createInvoice: (pageId: string, payload: ActivationInvoicePayload) =>
    http
      .post<Envelope<ActivationResult>>(`/app/landing/pages/${pageId}/activation-invoice`, payload)
      .then((r) => r.data.data),

  list: (filter: ActivationInvoiceFilter) =>
    http
      .get<Envelope<ActivationInvoicesPage>>('/app/landing/activations', {
        params: {
          ...(filter.status ? { status: filter.status } : {}),
          page: filter.page,
          per_page: filter.per_page,
        },
      })
      .then((r) => r.data.data),

  // Memutar token preview: link lama mati dan link baru hanya dikembalikan di response ini.
  renew: (id: string, payload: RenewPayload) =>
    http
      .post<Envelope<ActivationResult>>(`/app/landing/activations/${id}/renew`, payload)
      .then((r) => r.data.data),
}
