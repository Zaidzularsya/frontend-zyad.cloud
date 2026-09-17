import {
  ArrowLeftRight,
  BookOpen,
  Calculator,
  CalendarClock,
  LayoutDashboard,
  Scale,
  TrendingUp,
  Wallet,
} from 'lucide-vue-next'

import type { MenuChildItem } from '@/config/menu'

export function buildFinanceMenuItems(): MenuChildItem[] {
  return [
    {
      label: 'Dashboard',
      route: 'platform-finance-dashboard',
      icon: LayoutDashboard,
      permission: 'platform.finance.reports.view',
    },
    {
      label: 'Chart of Accounts',
      route: 'platform-finance-accounts',
      icon: BookOpen,
      permission: 'platform.finance.coa.read',
    },
    {
      label: 'Tahun & Periode Buku',
      route: 'platform-finance-fiscal-periods',
      icon: CalendarClock,
      permission: 'platform.finance.coa.read',
    },
    {
      label: 'Jurnal Entry',
      route: 'platform-finance-journal',
      icon: Calculator,
      permission: 'platform.finance.journal.read',
    },
    {
      label: 'Akun Kas & Bank',
      route: 'platform-finance-cash-bank-accounts',
      icon: Wallet,
      permission: 'platform.finance.cashbank.read',
    },
    {
      label: 'Transaksi Kas & Bank',
      route: 'platform-finance-cash-transactions',
      icon: ArrowLeftRight,
      permission: 'platform.finance.cashbank.read',
    },
    {
      label: 'Rekonsiliasi Bank',
      route: 'platform-finance-bank-reconciliation',
      icon: Wallet,
      permission: 'platform.finance.cashbank.read',
    },
    {
      label: 'Trial Balance',
      route: 'platform-finance-trial-balance',
      icon: Scale,
      permission: 'platform.finance.reports.view',
    },
    {
      label: 'Laporan Laba Rugi',
      route: 'platform-finance-profit-loss',
      icon: TrendingUp,
      permission: 'platform.finance.reports.view',
    },
    {
      label: 'Neraca',
      route: 'platform-finance-balance-sheet',
      icon: Scale,
      permission: 'platform.finance.reports.view',
    },
  ]
}
