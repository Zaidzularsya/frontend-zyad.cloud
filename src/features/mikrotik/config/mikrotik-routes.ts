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
      path: `${pathPrefix}/tasks`,
      name: `${namePrefix}-tasks`,
      component: () => import('@/features/mikrotik/pages/TasksPage.vue'),
      meta: { title: 'Tugas Isolir', permissions: ['mikrotik_task.read'] },
    },
  ]
}
