import { useMutation } from '@tanstack/vue-query'

import { useInvalidateEntitlements } from '@/features/entitlements/api/entitlements.queries'

import { activationApi } from './activation.api'
import type { ActivationInvoicePayload } from '@/features/landing/activation/utils/activation-state'

export function useCreateActivationInvoiceMutation() {
  const invalidateEntitlements = useInvalidateEntitlements()
  return useMutation({
    mutationFn: (vars: { pageId: string; payload: ActivationInvoicePayload }) =>
      activationApi.createInvoice(vars.pageId, vars.payload),
    // Kuota invoice berubah; daftar halaman dimuat ulang oleh pemanggil (bukan query cache).
    onSuccess: () => invalidateEntitlements(),
  })
}
