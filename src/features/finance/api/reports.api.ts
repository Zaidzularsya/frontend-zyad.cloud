import { apiClient } from '@/lib/api-client'

export interface FinanceTrialBalanceLine {
  account_id: string
  account_code: string
  account_name: string
  debit: string
  credit: string
}

export interface FinanceTrialBalance {
  as_of_date: string
  lines: FinanceTrialBalanceLine[]
  total_debit: string
  total_credit: string
  is_balanced: boolean
}

export interface FinanceReportLine {
  account_id: string
  account_code: string
  account_name: string
  amount: string
}

export interface FinanceReportSection {
  report_section: string
  label: string
  accounts: FinanceReportLine[]
  subtotal: string
}

export interface FinanceProfitLoss {
  start_date: string
  end_date: string
  sections: FinanceReportSection[]
  net_income: string
}

export interface FinanceBalanceSheet {
  as_of_date: string
  asset_sections: FinanceReportSection[]
  liability_sections: FinanceReportSection[]
  equity_sections: FinanceReportSection[]
  current_year_net_income: string
  total_assets: string
  total_liabilities: string
  total_equity: string
  is_balanced: boolean
}

export interface FinanceGeneralLedgerLine {
  entry_date: string
  entry_number: string
  account_id: string
  account_code: string
  account_name: string
  description?: string
  debit: string
  credit: string
}

export interface FinanceGeneralLedger {
  start_date: string
  end_date: string
  lines: FinanceGeneralLedgerLine[]
}

export interface FinanceAccountLedgerLine {
  entry_date: string
  entry_number: string
  description?: string
  debit: string
  credit: string
  running_balance: string
}

export interface FinanceAccountLedger {
  account_id: string
  account_code: string
  account_name: string
  start_date: string
  end_date: string
  opening_balance: string
  lines: FinanceAccountLedgerLine[]
  closing_balance: string
}

export const financeReportApi = {
  trialBalance(asOfDate: string) {
    return apiClient.get<FinanceTrialBalance>('/platform/finance/trial-balance', {
      params: { as_of_date: asOfDate },
    })
  },
  profitLoss(startDate: string, endDate: string) {
    return apiClient.get<FinanceProfitLoss>('/platform/finance/reports/profit-loss', {
      params: { start_date: startDate, end_date: endDate },
    })
  },
  balanceSheet(asOfDate: string) {
    return apiClient.get<FinanceBalanceSheet>('/platform/finance/reports/balance-sheet', {
      params: { as_of_date: asOfDate },
    })
  },
  generalLedger(startDate: string, endDate: string, accountId?: string) {
    return apiClient.get<FinanceGeneralLedger>('/platform/finance/general-ledger', {
      params: { start_date: startDate, end_date: endDate, account_id: accountId || undefined },
    })
  },
  accountLedger(accountId: string, startDate: string, endDate: string) {
    return apiClient.get<FinanceAccountLedger>(`/platform/finance/account-ledger/${accountId}`, {
      params: { start_date: startDate, end_date: endDate },
    })
  },
}
