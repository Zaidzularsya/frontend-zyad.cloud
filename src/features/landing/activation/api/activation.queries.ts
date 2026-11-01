import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'

import { useInvalidateEntitlements } from '@/features/entitlements/api/entitlements.queries'

import { activationApi } from './activation.api'
import type { ActivationInvoicePayload } from '@/features/landing/activation/utils/activation-state'
import type {
  ActivationInvoiceFilter,
  RenewPayload,
} from '@/features/landing/activation/utils/activation-invoices'

export function useCreateActivationInvoiceMutation() {
  const invalidateEntitlements = useInvalidateEntitlements()
  return useMutation({
    mutationFn: (vars: { pageId: string; payload: ActivationInvoicePayload }) =>
      activationApi.createInvoice(vars.pageId, vars.payload),
    // Kuota invoice berubah; daftar halaman dimuat ulang oleh pemanggil (bukan query cache).
    onSuccess: () => invalidateEntitlements(),
  })
}

export const activationInvoicesKey = ['landing', 'activation-invoices'] as const

export function useActivationInvoicesQuery(filter: MaybeRefOrGetter<ActivationInvoiceFilter>) {
  return useQuery({
    queryKey: computed(() => [...activationInvoicesKey, toValue(filter)]),
    queryFn: () => activationApi.list(toValue(filter)),
    placeholderData: keepPreviousData,
  })
}

export function useRenewActivationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: string; payload: RenewPayload }) =>
      activationApi.renew(vars.id, vars.payload),
    // Jatuh tempo preview berubah di daftar.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: activationInvoicesKey }),
  })
}
