import { http } from '@/lib/http'

import type {
  ActivationInvoicePayload,
  ActivationResult,
} from '@/features/landing/activation/utils/activation-state'

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
}
