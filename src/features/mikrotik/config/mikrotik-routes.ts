import type { RouteRecordRaw } from 'vue-router'

// Fitur Jaringan (isolir PPPoE Mikrotik) untuk tenant. namePrefix dipisah dari pathPrefix mengikuti
// pola receivable-routes supaya bisa dipasang di tree lain tanpa bentrok nama.
export function buildMikrotikRoutes(
  pathPrefix: string,
  namePrefix: string = pathPrefix,
): RouteRecordRaw[] {
  return [
    {
      path: pathPrefix,
      name: namePrefix,
      component: () => import('@/features/mikrotik/pages/OverviewPage.vue'),
      meta: { title: 'Ringkasan Jaringan', permissions: ['mikrotik_router.read'] },
    },
    {
      path: `${pathPrefix}/routers`,
      name: `${namePrefix}-routers`,
      component: () => import('@/features/mikrotik/pages/RoutersPage.vue'),
      meta: { title: 'Router', permissions: ['mikrotik_router.read'] },
    },
    {
      path: `${pathPrefix}/accounts`,
      name: `${namePrefix}-accounts`,
      component: () => import('@/features/mikrotik/pages/AccountsPage.vue'),
      meta: { title: 'Akun PPPoE', permissions: ['mikrotik_secret.read'] },
    },
    {
      path: `${pathPrefix}/secrets/:id`,
      name: `${namePrefix}-secret-detail`,
      component: () => import('@/features/mikrotik/pages/SecretDetailPage.vue'),
      meta: { title: 'Detail Secret', permissions: ['mikrotik_secret.read'] },
    },
    {
      path: `${pathPrefix}/isolation`,
      name: `${namePrefix}-isolation`,
      component: () => import('@/features/mikrotik/pages/IsolationPage.vue'),
      // Halaman sendiri memeriksa mikrotik_control.read sebelum memuat kendali.
      meta: { title: 'Isolir', permissions: ['mikrotik_task.read'] },
    },
    // Halaman Tugas, Kendali, dan Peluncuran digabung ke Isolir. Nama lama dipertahankan pada
    // record redirect supaya tautan atau bookmark lama tetap mendarat di tab yang setara.
    {
      path: `${pathPrefix}/tasks`,
      name: `${namePrefix}-tasks`,
      redirect: (to) => ({
        name: `${namePrefix}-isolation`,
        query: { ...to.query, tab: 'tasks' },
      }),
    },
    {
      path: `${pathPrefix}/control`,
      name: `${namePrefix}-control`,
      redirect: { name: `${namePrefix}-isolation`, query: { tab: 'control' } },
    },
    {
      path: `${pathPrefix}/launch`,
      name: `${namePrefix}-launch`,
      redirect: { name: `${namePrefix}-isolation` },
    },
  ]
}
