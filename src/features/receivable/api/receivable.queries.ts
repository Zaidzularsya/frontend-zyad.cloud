import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, ref, type Ref } from 'vue'

import { useInvalidateEntitlements } from '@/features/entitlements/api/entitlements.queries'
import { isQuotaExceededError } from '@/features/entitlements/utils/quota-error'

import {
  receivableApi,
  type AccountListParams,
  type AccountPayload,
  type ContractListParams,
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
  contracts: () => [...receivableKeys.all, 'contracts'] as const,
  contractList: (params: ContractListParams) =>
    [...receivableKeys.contracts(), 'list', params] as const,
  contract: (id: string) => [...receivableKeys.contracts(), 'detail', id] as const,
  overview: () => [...receivableKeys.all, 'overview'] as const,
  settings: () => [...receivableKeys.all, 'settings'] as const,
  senders: () => [...receivableKeys.all, 'senders'] as const,
}

// Satu invoice tampil di daftar, detail, riwayat kirim, dan pembayaran: mutation menyegarkan semuanya.
function useInvalidateReceivable() {
  const queryClient = useQueryClient()
  return () => void queryClient.invalidateQueries({ queryKey: receivableKeys.all })
}

export function useAccountsQuery(params: Ref<AccountListParams>) {
  return useQuery({
    queryKey: computed(() => receivableKeys.accounts(params.value)),
    queryFn: () => receivableApi.accounts.list(params.value),
    placeholderData: keepPreviousData,
  })
}

// Akun penagihan milik satu kontak CRM; null bila kontak belum menjadi pelanggan.
// Bila ada beberapa akun, hanya yang pertama dikembalikan (disengaja), sisanya diabaikan.
export function useAccountByContactQuery(
  contactId: Ref<string>,
  enabled: Ref<boolean> = ref(true),
) {
  return useQuery({
    queryKey: computed(
      () => [...receivableKeys.all, 'account-by-contact', contactId.value] as const,
    ),
    queryFn: async () => {
      const res = await receivableApi.accounts.list({
        page: 1,
        per_page: 1,
        contact_id: contactId.value,
      })
      return res.data[0] ?? null
    },
    enabled: computed(() => enabled.value && Boolean(contactId.value)),
  })
}

export function useCreateAccountMutation() {
  const invalidate = useInvalidateReceivable()
  return useMutation({
    mutationFn: (payload: AccountPayload) => receivableApi.accounts.create(payload),
    onSuccess: invalidate,
  })
}

export function useInvoicesQuery(
  params: Ref<InvoiceListParams>,
  enabled: Ref<boolean> = ref(true),
) {
  return useQuery({
    enabled,
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
  const invalidateEntitlements = useInvalidateEntitlements()
  return useMutation({
    mutationFn: (payload: InvoicePayload) => receivableApi.invoices.create(payload),
    onSuccess: () => {
      invalidate()
      invalidateEntitlements()
    },
    onError: (error: unknown) => {
      if (isQuotaExceededError(error)) invalidateEntitlements()
    },
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
  const invalidateEntitlements = useInvalidateEntitlements()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      receivableApi.invoices.void(id, reason),
    onSuccess: () => {
      invalidate()
      invalidateEntitlements()
    },
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
    mutationFn: (payload: Parameters<typeof receivableApi.settings.update>[0]) =>
      receivableApi.settings.update(payload),
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

export function useOverviewQuery() {
  return useQuery({
    queryKey: receivableKeys.overview(),
    queryFn: () => receivableApi.overview.get(),
  })
}

export function useContractsQuery(params: Ref<ContractListParams>) {
  return useQuery({
    queryKey: computed(() => receivableKeys.contractList(params.value)),
    queryFn: () => receivableApi.contracts.list(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useContractQuery(id: Ref<string | undefined>) {
  return useQuery({
    queryKey: computed(() => receivableKeys.contract(id.value ?? '')),
    queryFn: () => receivableApi.contracts.get(id.value as string),
    enabled: computed(() => Boolean(id.value)),
  })
}

export function useSetContractEndDateMutation() {
  const invalidate = useInvalidateReceivable()
  return useMutation({
    mutationFn: (v: { id: string; endDate: string | null }) =>
      receivableApi.contracts.setEndDate(v.id, v.endDate),
    onSuccess: invalidate,
  })
}

export function useEndContractMutation() {
  const invalidate = useInvalidateReceivable()
  return useMutation({
    mutationFn: (v: { id: string; reason: string; endDate?: string }) =>
      receivableApi.contracts.end(v.id, { reason: v.reason, end_date: v.endDate }),
    onSuccess: invalidate,
  })
}
