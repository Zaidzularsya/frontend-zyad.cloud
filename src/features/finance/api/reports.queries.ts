import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { financeReportApi } from '@/features/finance/api/reports.api'

export const financeReportKeys = {
  all: ['finance-reports'] as const,
  trialBalance: (asOfDate: string) =>
    [...financeReportKeys.all, 'trial-balance', asOfDate] as const,
  profitLoss: (start: string, end: string) =>
    [...financeReportKeys.all, 'profit-loss', start, end] as const,
  balanceSheet: (asOfDate: string) =>
    [...financeReportKeys.all, 'balance-sheet', asOfDate] as const,
  generalLedger: (start: string, end: string, accountId: string) =>
    [...financeReportKeys.all, 'general-ledger', start, end, accountId] as const,
  accountLedger: (accountId: string, start: string, end: string) =>
    [...financeReportKeys.all, 'account-ledger', accountId, start, end] as const,
}

export function useFinanceTrialBalanceQuery(asOfDate: Ref<string>) {
  return useQuery({
    queryKey: computed(() => financeReportKeys.trialBalance(asOfDate.value)),
    queryFn: () => financeReportApi.trialBalance(asOfDate.value),
    enabled: computed(() => Boolean(asOfDate.value)),
  })
}

export function useFinanceProfitLossQuery(startDate: Ref<string>, endDate: Ref<string>) {
  return useQuery({
    queryKey: computed(() => financeReportKeys.profitLoss(startDate.value, endDate.value)),
    queryFn: () => financeReportApi.profitLoss(startDate.value, endDate.value),
    enabled: computed(() => Boolean(startDate.value) && Boolean(endDate.value)),
  })
}

export function useFinanceBalanceSheetQuery(asOfDate: Ref<string>) {
  return useQuery({
    queryKey: computed(() => financeReportKeys.balanceSheet(asOfDate.value)),
    queryFn: () => financeReportApi.balanceSheet(asOfDate.value),
    enabled: computed(() => Boolean(asOfDate.value)),
  })
}

export function useFinanceGeneralLedgerQuery(
  startDate: Ref<string>,
  endDate: Ref<string>,
  accountId: Ref<string>,
) {
  return useQuery({
    queryKey: computed(() =>
      financeReportKeys.generalLedger(startDate.value, endDate.value, accountId.value),
    ),
    queryFn: () => financeReportApi.generalLedger(startDate.value, endDate.value, accountId.value),
    enabled: computed(() => Boolean(startDate.value) && Boolean(endDate.value)),
  })
}

export function useFinanceAccountLedgerQuery(
  accountId: Ref<string>,
  startDate: Ref<string>,
  endDate: Ref<string>,
) {
  return useQuery({
    queryKey: computed(() =>
      financeReportKeys.accountLedger(accountId.value, startDate.value, endDate.value),
    ),
    queryFn: () => financeReportApi.accountLedger(accountId.value, startDate.value, endDate.value),
    enabled: computed(
      () => Boolean(accountId.value) && Boolean(startDate.value) && Boolean(endDate.value),
    ),
  })
}
