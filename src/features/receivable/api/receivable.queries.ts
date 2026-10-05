import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import {
  receivableApi,
  type AccountPayload,
  type InvoiceListParams,
  type InvoicePayload,
  type PaymentPayload,
  type SendInvoicePayload,
} from '@/features/receivable/api/receivable.api'

export const receivableKeys = {
  all: ['receivable'] as const,
  accounts: (params: object) => [...receivableKeys.all, 'accounts', params] as const,
  invoices: () => [...receivableKeys.all, 'invoices'] as const,
  list: (params: InvoiceListParams) => [...receivableKeys.invoices(), 'list', params] as const,
  detail: (id: string) => [...receivableKeys.invoices(), 'detail', id] as const,
  sends: (id: string) => [...receivableKeys.invoices(), 'sends', id] as const,
  invoicePayments: (id: string) => [...receivableKeys.invoices(), 'payments', id] as const,
  payments: (params: object) => [...receivableKeys.all, 'payments', params] as const,
  settings: () => [...receivableKeys.all, 'settings'] as const,
  senders: () => [...receivableKeys.all, 'senders'] as const,
}

// Satu invoice tampil di daftar, detail, riwayat kirim, dan pembayaran: mutation menyegarkan semuanya.
function useInvalidateReceivable() {
  const queryClient = useQueryClient()
  return () => void queryClient.invalidateQueries({ queryKey: receivableKeys.all })
}

export function useAccountsQuery(params: Ref<{ page: number; per_page: number; search?: string }>) {
  return useQuery({
    queryKey: computed(() => receivableKeys.accounts(params.value)),
    queryFn: () => receivableApi.accounts.list(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useCreateAccountMutation() {
  const invalidate = useInvalidateReceivable()
  return useMutation({
    mutationFn: (payload: AccountPayload) => receivableApi.accounts.create(payload),
    onSuccess: invalidate,
  })
}

export function useInvoicesQuery(params: Ref<InvoiceListParams>) {
  return useQuery({
    queryKey: computed(() => receivableKeys.list(params.value)),
    queryFn: () => receivableApi.invoices.list(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useInvoiceQuery(id: Ref<string | undefined>) {
  return useQuery({
    queryKey: computed(() => receivableKeys.detail(id.value ?? '')),
    queryFn: () => receivableApi.invoices.get(id.value as string),
    enabled: computed(() => Boolean(id.value)),
  })
}

export function useInvoiceSendsQuery(id: Ref<string | undefined>) {
  return useQuery({
    queryKey: computed(() => receivableKeys.sends(id.value ?? '')),
    queryFn: () => receivableApi.invoices.sends(id.value as string),
    enabled: computed(() => Boolean(id.value)),
  })
}

export function useInvoicePaymentsQuery(id: Ref<string | undefined>) {
  return useQuery({
    queryKey: computed(() => receivableKeys.invoicePayments(id.value ?? '')),
    queryFn: () => receivableApi.invoices.payments(id.value as string),
    enabled: computed(() => Boolean(id.value)),
  })
}

export function useCreateInvoiceMutation() {
  const invalidate = useInvalidateReceivable()
  return useMutation({
    mutationFn: (payload: InvoicePayload) => receivableApi.invoices.create(payload),
    onSuccess: invalidate,
  })
}

export function useUpdateInvoiceMutation() {
  const invalidate = useInvalidateReceivable()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: InvoicePayload }) =>
      receivableApi.invoices.update(id, payload),
    onSuccess: invalidate,
  })
}

export function useIssueInvoiceMutation() {
  const invalidate = useInvalidateReceivable()
  return useMutation({
    mutationFn: (id: string) => receivableApi.invoices.issue(id),
    onSuccess: invalidate,
  })
}

export function useVoidInvoiceMutation() {
  const invalidate = useInvalidateReceivable()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      receivableApi.invoices.void(id, reason),
    onSuccess: invalidate,
  })
}

export function useInvoiceLinkMutation() {
  return useMutation({ mutationFn: (id: string) => receivableApi.invoices.link(id) })
}

export function useSendInvoiceMutation() {
  const invalidate = useInvalidateReceivable()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SendInvoicePayload }) =>
      receivableApi.invoices.send(id, payload),
    onSuccess: invalidate,
  })
}

export function useRecordPaymentMutation() {
  const invalidate = useInvalidateReceivable()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PaymentPayload }) =>
      receivableApi.invoices.recordPayment(id, payload),
    onSuccess: invalidate,
  })
}

export function usePaymentsQuery(params: Ref<{ page: number; per_page: number }>) {
  return useQuery({
    queryKey: computed(() => receivableKeys.payments(params.value)),
    queryFn: () => receivableApi.payments.list(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useReceivableSettingsQuery() {
  return useQuery({
    queryKey: receivableKeys.settings(),
    queryFn: receivableApi.settings.get,
    staleTime: 60_000,
  })
}

export function useUpdateReceivableSettingsMutation() {
  const invalidate = useInvalidateReceivable()
  return useMutation({
    mutationFn: receivableApi.settings.update,
    onSuccess: invalidate,
  })
}

export function useSendersQuery(enabled: Ref<boolean>) {
  return useQuery({
    queryKey: receivableKeys.senders(),
    queryFn: receivableApi.senders,
    enabled,
    staleTime: 60_000,
  })
}
