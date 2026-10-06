import type { RouteRecordRaw } from 'vue-router'

// Sales order (tenant & platform). namePrefix terpisah dari pathPrefix supaya halaman yang sama
// bisa dipasang di tree platform tanpa bentrok nama route.
export function buildSalesOrderRoutes(
  pathPrefix: string,
  namePrefix: string = pathPrefix,
): RouteRecordRaw[] {
  return [
    {
      path: `${pathPrefix}/orders`,
      name: `${namePrefix}-orders`,
      component: () => import('@/features/crm/sales-orders/pages/SalesOrdersPage.vue'),
      meta: { title: 'Sales Orders', permissions: ['sales_order.read'] },
    },
    {
      path: `${pathPrefix}/orders/:id`,
      name: `${namePrefix}-order-detail`,
      component: () => import('@/features/crm/sales-orders/pages/SalesOrderDetailPage.vue'),
      meta: { title: 'Detail Sales Order', permissions: ['sales_order.read'] },
    },
  ]
}
