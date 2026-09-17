import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import {
  financeCashBankApi,
  type CreateFinanceBankReconciliationPayload,
  type CreateFinanceCashBankAccountPayload,
  type CreateFinanceCashTransactionPayload,
  type FinanceCashTransactionListParams,
  type UpdateFinanceCashBankAccountPayload,
} from '@/features/finance/api/cash-bank.api'
import { financeReportKeys } from '@/features/finance/api/reports.queries'

export const financeCashBankKeys = {
  all: ['finance-cash-bank'] as const,
  accounts: (includeInactive: boolean) =>
    [...financeCashBankKeys.all, 'accounts', includeInactive] as const,
  transactions: (params: FinanceCashTransactionListParams) =>
    [...financeCashBankKeys.all, 'transactions', params] as const,
  reconciliations: (cashBankAccountId: string) =>
    [...financeCashBankKeys.all, 'reconciliations', cashBankAccountId] as const,
}

export function useFinanceCashBankAccountsQuery(includeInactive: Ref<boolean>) {
  return useQuery({
    queryKey: computed(() => financeCashBankKeys.accounts(includeInactive.value)),
    queryFn: () => financeCashBankApi.listAccounts(includeInactive.value),
  })
}

export function useCreateFinanceCashBankAccountMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateFinanceCashBankAccountPayload) =>
      financeCashBankApi.createAccount(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeCashBankKeys.all })
    },
  })
}

export function useUpdateFinanceCashBankAccountMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateFinanceCashBankAccountPayload }) =>
      financeCashBankApi.updateAccount(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeCashBankKeys.all })
    },
  })
}

export function useFinanceCashTransactionsQuery(params: Ref<FinanceCashTransactionListParams>) {
  return useQuery({
    queryKey: computed(() => financeCashBankKeys.transactions({ ...params.value })),
    queryFn: () => financeCashBankApi.listTransactions(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useCreateFinanceCashTransactionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateFinanceCashTransactionPayload) =>
      financeCashBankApi.createTransaction(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeCashBankKeys.all })
      void queryClient.invalidateQueries({ queryKey: financeReportKeys.all })
    },
  })
}

export function useFinanceReconciliationsQuery(cashBankAccountId: Ref<string>) {
  return useQuery({
    queryKey: computed(() => financeCashBankKeys.reconciliations(cashBankAccountId.value)),
    queryFn: () => financeCashBankApi.listReconciliations(cashBankAccountId.value),
    enabled: computed(() => Boolean(cashBankAccountId.value)),
  })
}

export function useCreateFinanceReconciliationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateFinanceBankReconciliationPayload) =>
      financeCashBankApi.createReconciliation(payload),
    onSuccess: (_, payload) => {
      void queryClient.invalidateQueries({
        queryKey: financeCashBankKeys.reconciliations(payload.cash_bank_account_id),
      })
    },
  })
}

export function useCompleteFinanceReconciliationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => financeCashBankApi.completeReconciliation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeCashBankKeys.all })
    },
  })
}
