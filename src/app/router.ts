import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import { env } from '@/config/env'
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
        meta: { title: 'Syarat & Ketentuan' },
      },
      {
        path: 'legal/privacy',
        name: 'legal-privacy',
        component: () => import('@/features/public/pages/PrivacyPolicyPage.vue'),
        meta: { title: 'Kebijakan Privasi' },
      },
      {
        path: 'legal/refund',
        name: 'legal-refund',
        component: () => import('@/features/public/pages/RefundPolicyPage.vue'),
        meta: { title: 'Kebijakan Refund' },
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
        component: placeholder,
        props: {
          title: 'CRM Overview',
          description: 'Pipeline, kontak, perusahaan, aktivitas, dan deal.',
        },
        meta: { title: 'CRM Overview' },
      },
      {
        path: 'landing-pages',
        name: 'landing-pages',
        redirect: { name: 'landing-pages-pages' },
        meta: { title: 'Landing Page Management' },
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
      ...buildLandingManagementRoutes('platform-landing-pages'),
      {
        path: 'branding',
        name: 'platform-branding',
        component: () => import('@/features/platform/pages/BrandingManagementPage.vue'),
        meta: { title: 'Branding Management' },
      },
      {
        path: 'users',
        name: 'platform-users',
        component: () => import('@/features/users/pages/UsersPage.vue'),
        meta: { title: 'Admins & Roles' },
      },
      {
        path: 'customers',
        name: 'platform-customers',
        component: () => import('@/features/platform/pages/CustomerManagementPage.vue'),
        meta: { title: 'Customer Management' },
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
      {
        path: 'leads',
        name: 'platform-leads',
        component: () => import('@/features/platform/pages/LeadManagementPage.vue'),
        meta: { title: 'Lead Management' },
      },
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
    ],
  },
  {
    path: '/landing-preview/:slug',
    name: 'landing-preview',
    component: () => import('@/features/landing/renderer/pages/LandingPreviewPage.vue'),
    meta: { title: 'Landing Preview', requiresAuth: true },
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
