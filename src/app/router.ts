import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import { env } from '@/config/env'
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
    component: () => import('@/layouts/DashboardLayout.vue'),
    meta: { requiresAuth: true, requiresTenant: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/features/dashboard/pages/DashboardPage.vue'),
        meta: { title: 'Dashboard', permissions: ['dashboard.read'] },
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
        path: 'users',
        name: 'users',
        component: () => import('@/features/users/pages/UsersPage.vue'),
        meta: { title: 'Users', permissions: ['users.read'] },
      },
      {
        path: 'roles',
        name: 'roles',
        component: placeholder,
        props: { title: 'Roles', description: 'Kelola role dan matriks permission workspace.' },
        meta: { title: 'Roles', permissions: ['roles.read'] },
      },
      {
        path: 'billing',
        name: 'billing',
        component: placeholder,
        props: {
          title: 'Billing',
          description: 'Invoice, metode pembayaran, dan penggunaan paket.',
        },
        meta: { title: 'Billing', permissions: ['billing.read'] },
      },
      {
        path: 'audit-logs',
        name: 'audit-logs',
        component: placeholder,
        props: { title: 'Audit Logs', description: 'Jejak aktivitas penting di dalam organisasi.' },
        meta: { title: 'Audit Logs', permissions: ['audit-logs.read'] },
      },
      {
        path: 'settings',
        name: 'settings',
        component: placeholder,
        props: {
          title: 'Settings',
          description: 'Preferensi organisasi, branding, dan integrasi.',
        },
        meta: { title: 'Settings', permissions: ['settings.read'] },
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
