import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import { env } from '@/config/env'
import { buildCrmRoutes } from '@/features/crm/config/crm-routes'
import { buildLandingManagementRoutes } from '@/features/landing/builder/config/landing-menu'
import { authGuard } from '@/middleware/auth.guard'
import { guestGuard } from '@/middleware/guest.guard'
import { permissionGuard } from '@/middleware/permission.guard'
import { tenantGuard } from '@/middleware/tenant.guard'

const placeholder = () => import('@/views/FeaturePlaceholderPage.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/auth',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('@/features/auth/pages/LoginPage.vue'),
        meta: { title: 'Masuk', guestOnly: true },
      },
      {
        path: 'register',
        name: 'register',
        component: () => import('@/features/auth/pages/RegisterPage.vue'),
        meta: { title: 'Daftar', guestOnly: true },
      },
      {
        path: 'google/callback',
        name: 'google-callback',
        component: () => import('@/features/auth/pages/GoogleCallbackPage.vue'),
        meta: { title: 'Login Google' },
      },
    ],
  },
  {
    path: '/workspaces',
    component: () => import('@/layouts/PublicLayout.vue'),
    children: [
      {
        path: 'select',
        name: 'select-tenant',
        component: () => import('@/views/SelectTenantPage.vue'),
        meta: { title: 'Pilih Workspace', requiresAuth: true },
      },
    ],
  },
  {
    path: '/',
    component: () => import('@/layouts/MarketingLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/features/public/pages/MarketingLandingPage.vue'),
        meta: { title: 'Zyad Cloud - Platform Multi-Tenant' },
      },
      {
        path: 'legal/terms',
        name: 'legal-terms',
        component: () => import('@/features/public/pages/TermsOfServicePage.vue'),
        meta: { title: 'Syarat & Ketentuan', layoutFooter: true },
      },
      {
        path: 'legal/privacy',
        name: 'legal-privacy',
        component: () => import('@/features/public/pages/PrivacyPolicyPage.vue'),
        meta: { title: 'Kebijakan Privasi', layoutFooter: true },
      },
      {
        path: 'legal/refund',
        name: 'legal-refund',
        component: () => import('@/features/public/pages/RefundPolicyPage.vue'),
        meta: { title: 'Kebijakan Refund', layoutFooter: true },
      },
      {
        path: 'legal/aup',
        name: 'legal-aup',
        component: () => import('@/features/public/pages/AcceptableUsePolicyPage.vue'),
        meta: { title: 'Acceptable Use Policy', layoutFooter: true },
      },
      {
        path: ':slug',
        name: 'public-landing-page',
        component: () => import('@/features/landing/renderer/pages/DynamicLandingPage.vue'),
        meta: { title: 'Landing Page' },
      },
    ],
  },
  {
    path: '/app',
    component: () => import('@/layouts/DashboardLayout.vue'),
    redirect: { name: 'dashboard' },
    meta: { requiresAuth: true, requiresTenant: true },
    children: [
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/features/profile/pages/ProfilePage.vue'),
        meta: { title: 'Profile' },
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/features/dashboard/pages/DashboardPage.vue'),
        meta: { title: 'Dashboard' },
      },
      {
        path: 'crm',
        name: 'crm',
        redirect: { name: 'crm-contacts' },
        meta: { title: 'CRM' },
      },
      ...buildCrmRoutes('crm'),
      {
        path: 'landing-pages',
        name: 'landing-pages',
        redirect: { name: 'landing-pages-pages' },
        meta: { title: 'Landing Page Management' },
      },
      {
        // Menu "Footer" dan "Settings" dibubarkan — header/footer situs
        // sekarang diatur dari Content (block "Header tenant"/"Footer
        // tenant"). Redirect supaya bookmark lama tidak 404.
        path: 'landing-pages/footer',
        redirect: { name: 'landing-pages-content' },
      },
      {
        path: 'landing-pages/navigation',
        redirect: { name: 'landing-pages-content' },
      },
      {
        path: 'landing-pages/brand-theme',
        redirect: { name: 'landing-pages-content' },
      },
      ...buildLandingManagementRoutes('landing-pages'),
      {
        path: 'users',
        name: 'users',
        component: () => import('@/features/users/pages/UsersPage.vue'),
        meta: { title: 'Users', permissions: ['user.read'] },
      },
      {
        path: 'users/:id',
        name: 'user-detail',
        component: () => import('@/features/users/pages/UserDetailPage.vue'),
        meta: { title: 'User Detail', permissions: ['user.read'] },
      },
      {
        path: 'rbac',
        alias: ['/roles'],
        name: 'rbac',
        component: () => import('@/features/rbac/pages/RbacPage.vue'),
        meta: {
          title: 'Core Permission & RBAC',
          permissions: ['role.read', 'permission.read'],
        },
      },
      {
        path: 'notifications',
        name: 'notifications',
        component: () => import('@/features/notifications/pages/NotificationManagementPage.vue'),
        meta: {
          title: 'Notification Management',
          permissions: ['notification_template.read'],
        },
      },
      {
        path: 'billing',
        name: 'billing',
        component: () => import('@/features/customer/pages/PlanUpgradePage.vue'),
        meta: { title: 'Billing' },
      },
      {
        path: 'checkout',
        name: 'checkout',
        component: () => import('@/features/customer/pages/CheckoutPage.vue'),
        meta: { title: 'Checkout' },
      },
      {
        path: 'checkout/success',
        name: 'checkout-success',
        component: () => import('@/features/customer/pages/CheckoutSuccessPage.vue'),
        meta: { title: 'Status Pembayaran' },
      },
      {
        path: 'checkout/failed',
        name: 'checkout-failed',
        component: () => import('@/features/customer/pages/CheckoutFailedPage.vue'),
        meta: { title: 'Pembayaran Gagal' },
      },
      {
        path: 'audit-logs',
        name: 'audit-logs',
        component: () => import('@/features/audit/pages/AuditLogsPage.vue'),
        meta: { title: 'Audit Logs', permissions: ['audit.read'] },
      },
      {
        path: 'settings',
        name: 'settings',
        component: placeholder,
        props: {
          title: 'Settings',
          description: 'Preferensi organisasi, branding, dan integrasi.',
        },
        meta: { title: 'Settings' },
      },
      {
        path: 'plan-upgrade',
        name: 'plan-upgrade',
        redirect: { name: 'billing' },
        meta: { title: 'Plan & Billing' },
      },
      {
        path: 'ticketing',
        name: 'ticketing',
        component: () => import('@/features/customer/pages/TicketingPage.vue'),
        meta: { title: 'Support & Ticketing' },
      },
      {
        path: 'storage',
        name: 'storage',
        component: () => import('@/features/storage/pages/StorageManagementPage.vue'),
        meta: { title: 'Storage', permissions: ['storage.object.read'] },
      },
      {
        path: 'forbidden',
        name: 'forbidden',
        component: () => import('@/views/ForbiddenPage.vue'),
        meta: { title: 'Akses Ditolak' },
      },
    ],
  },
  {
    path: '/platform',
    component: () => import('@/layouts/DashboardLayout.vue'),
    meta: { requiresAuth: true, requiresPlatform: true },
    children: [
      {
        path: 'dashboard',
        name: 'platform-dashboard',
        component: () => import('@/features/platform/pages/PlatformDashboardPage.vue'),
        meta: { title: 'Platform Overview' },
      },
      {
        path: 'landing-pages',
        name: 'platform-landing-pages',
        redirect: { name: 'platform-landing-pages-pages' },
        meta: { title: 'Landing Page Management' },
      },
      {
        path: 'landing-pages/footer',
        redirect: { name: 'platform-landing-pages-content' },
      },
      {
        path: 'landing-pages/navigation',
        redirect: { name: 'platform-landing-pages-content' },
      },
      {
        path: 'landing-pages/brand-theme',
        redirect: { name: 'platform-landing-pages-content' },
      },
      ...buildLandingManagementRoutes('platform-landing-pages'),
      {
        path: 'users',
        name: 'platform-users',
        component: () => import('@/features/users/pages/UsersPage.vue'),
        meta: { title: 'Members' },
      },
      {
        path: 'users/:id',
        name: 'platform-user-detail',
        component: () => import('@/features/users/pages/UserDetailPage.vue'),
        meta: { title: 'Member Detail' },
      },
      {
        path: 'billing/plans',
        name: 'platform-billing-plans',
        component: () => import('@/features/billing/pages/PlatformBillingPlansPage.vue'),
        meta: {
          title: 'Product Catalog Management',
          permissions: ['platform.product.plan.read'],
        },
      },
      ...buildCrmRoutes('crm', 'platform-crm'),
      {
        path: 'notifications',
        name: 'platform-notifications',
        component: () => import('@/features/notifications/pages/NotificationManagementPage.vue'),
        meta: {
          title: 'Notification Management',
          permissions: ['notification_template.read'],
        },
      },
      {
        path: 'audit-logs',
        name: 'platform-audit-logs',
        component: () => import('@/features/audit/pages/AuditLogsPage.vue'),
        meta: { title: 'Audit Logs', permissions: ['audit.read'] },
      },
      {
        path: 'storage',
        name: 'platform-storage',
        component: () => import('@/features/platform/pages/StorageQuotaManagementPage.vue'),
        meta: { title: 'Storage Quota', permissions: ['platform.organization.manage'] },
      },
      {
        path: 'finance',
        name: 'platform-finance-dashboard',
        component: () => import('@/features/finance/pages/FinanceDashboardPage.vue'),
        meta: { title: 'Finance Dashboard', permissions: ['platform.finance.reports.view'] },
      },
      {
        path: 'finance/accounts',
        name: 'platform-finance-accounts',
        component: () => import('@/features/finance/pages/ChartOfAccountsPage.vue'),
        meta: { title: 'Chart of Accounts', permissions: ['platform.finance.coa.read'] },
      },
      {
        path: 'finance/fiscal-periods',
        name: 'platform-finance-fiscal-periods',
        component: () => import('@/features/finance/pages/FiscalPeriodsPage.vue'),
        meta: { title: 'Tahun & Periode Buku', permissions: ['platform.finance.coa.read'] },
      },
      {
        path: 'finance/journal-entries',
        name: 'platform-finance-journal',
        component: () => import('@/features/finance/pages/JournalEntryPage.vue'),
        meta: { title: 'Jurnal Entry', permissions: ['platform.finance.journal.read'] },
      },
      {
        path: 'finance/trial-balance',
        name: 'platform-finance-trial-balance',
        component: () => import('@/features/finance/pages/TrialBalancePage.vue'),
        meta: { title: 'Trial Balance', permissions: ['platform.finance.reports.view'] },
      },
      {
        path: 'finance/reports/profit-loss',
        name: 'platform-finance-profit-loss',
        component: () => import('@/features/finance/pages/ProfitLossReportPage.vue'),
        meta: { title: 'Laporan Laba Rugi', permissions: ['platform.finance.reports.view'] },
      },
      {
        path: 'finance/reports/balance-sheet',
        name: 'platform-finance-balance-sheet',
        component: () => import('@/features/finance/pages/BalanceSheetReportPage.vue'),
        meta: { title: 'Neraca', permissions: ['platform.finance.reports.view'] },
      },
      {
        path: 'finance/cash-bank-accounts',
        name: 'platform-finance-cash-bank-accounts',
        component: () => import('@/features/finance/pages/CashBankAccountsPage.vue'),
        meta: { title: 'Akun Kas & Bank', permissions: ['platform.finance.cashbank.read'] },
      },
      {
        path: 'finance/cash-transactions',
        name: 'platform-finance-cash-transactions',
        component: () => import('@/features/finance/pages/CashTransactionsPage.vue'),
        meta: { title: 'Transaksi Kas & Bank', permissions: ['platform.finance.cashbank.read'] },
      },
      {
        path: 'finance/bank-reconciliation',
        name: 'platform-finance-bank-reconciliation',
        component: () => import('@/features/finance/pages/BankReconciliationPage.vue'),
        meta: { title: 'Rekonsiliasi Bank', permissions: ['platform.finance.cashbank.read'] },
      },
      {
        path: 'finance/business-partners',
        name: 'platform-finance-business-partners',
        component: () => import('@/features/finance/pages/BusinessPartnersPage.vue'),
        meta: { title: 'Mitra Bisnis', permissions: ['platform.finance.arap.read'] },
      },
      {
        path: 'finance/receivables',
        name: 'platform-finance-receivables',
        component: () => import('@/features/finance/pages/ReceivablesPage.vue'),
        meta: { title: 'Piutang Usaha', permissions: ['platform.finance.arap.read'] },
      },
      {
        path: 'finance/payables',
        name: 'platform-finance-payables',
        component: () => import('@/features/finance/pages/PayablesPage.vue'),
        meta: { title: 'Utang Usaha', permissions: ['platform.finance.arap.read'] },
      },
      {
        path: 'finance/fixed-assets',
        name: 'platform-finance-fixed-assets',
        component: () => import('@/features/finance/pages/FixedAssetsPage.vue'),
        meta: { title: 'Aset Tetap', permissions: ['platform.finance.asset.read'] },
      },
      {
        path: 'finance/fixed-assets/:id',
        name: 'platform-finance-fixed-asset-detail',
        component: () => import('@/features/finance/pages/FixedAssetDetailPage.vue'),
        meta: { title: 'Detail Aset Tetap', permissions: ['platform.finance.asset.read'] },
      },
      {
        path: 'finance/tax-transactions',
        name: 'platform-finance-tax-transactions',
        component: () => import('@/features/finance/pages/TaxTransactionsPage.vue'),
        meta: { title: 'Transaksi Pajak', permissions: ['platform.finance.tax.read'] },
      },
      {
        path: 'finance/reports/tax-summary',
        name: 'platform-finance-tax-summary',
        component: () => import('@/features/finance/pages/TaxSummaryReportPage.vue'),
        meta: { title: 'Ringkasan Pajak', permissions: ['platform.finance.tax.read'] },
      },
    ],
  },
  {
    path: '/landing-preview/:slug',
    name: 'landing-preview',
    component: () => import('@/features/landing/renderer/pages/LandingPreviewPage.vue'),
    meta: { title: 'Landing Preview', requiresAuth: true },
  },
  {
    // WYSIWYG canvas iframe host for the FROZEN legacy section builder. Rendered
    // inside an <iframe> by LegacySectionBuilderPage; drives its section list
    // over postMessage. GrapesJS pages use GrapesPageFrame instead.
    path: '/landing-canvas/:pageId',
    name: 'landing-canvas',
    component: () => import('@/features/landing/renderer/pages/LandingCanvasFramePage.vue'),
    meta: { title: 'Landing Canvas', requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundPage.vue'),
    meta: { title: 'Halaman Tidak Ditemukan' },
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(authGuard)
router.beforeEach(guestGuard)
router.beforeEach(tenantGuard)
router.beforeEach(permissionGuard)

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} | ${env.VITE_APP_NAME}` : env.VITE_APP_NAME
})
