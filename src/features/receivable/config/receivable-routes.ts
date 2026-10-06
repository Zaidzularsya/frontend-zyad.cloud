import type { RouteRecordRaw } from 'vue-router'

// Penagihan tenant ke pelanggannya. namePrefix dipisah dari pathPrefix supaya halaman yang sama bisa
// dipasang di tree platform (/platform/billing/*) tanpa bentrok nama dengan route tenant.
export function buildReceivableRoutes(
  pathPrefix: string,
  namePrefix: string = pathPrefix,
): RouteRecordRaw[] {
  return [
    {
      path: `${pathPrefix}/invoices`,
      name: `${namePrefix}-invoices`,
      component: () => import('@/features/receivable/pages/InvoicesPage.vue'),
      meta: { title: 'Invoice', permissions: ['invoice.read'] },
    },
    {
      path: `${pathPrefix}/invoices/new`,
      name: `${namePrefix}-invoice-new`,
      component: () => import('@/features/receivable/pages/InvoiceFormPage.vue'),
      meta: { title: 'Invoice baru', permissions: ['invoice.create'] },
    },
    {
      path: `${pathPrefix}/invoices/:id`,
      name: `${namePrefix}-invoice-detail`,
      component: () => import('@/features/receivable/pages/InvoiceDetailPage.vue'),
      meta: { title: 'Detail Invoice', permissions: ['invoice.read'] },
    },
    {
      path: `${pathPrefix}/invoices/:id/edit`,
      name: `${namePrefix}-invoice-edit`,
      component: () => import('@/features/receivable/pages/InvoiceFormPage.vue'),
      meta: { title: 'Edit Invoice', permissions: ['invoice.update'] },
    },
    {
      path: `${pathPrefix}/payments`,
      name: `${namePrefix}-payments`,
      component: () => import('@/features/receivable/pages/PaymentsPage.vue'),
      meta: { title: 'Pembayaran', permissions: ['invoice.read'] },
    },
    {
      path: `${pathPrefix}/receivable-settings`,
      name: `${namePrefix}-receivable-settings`,
      component: () => import('@/features/receivable/pages/ReceivableSettingsPage.vue'),
      meta: { title: 'Pengaturan Penagihan', permissions: ['invoice.read'] },
    },
  ]
}

// Kontrak tagihan berulang (lahir dari konfirmasi Sales Order). Nama route eksplisit karena menu
// sudah memakai 'contracts' / 'platform-contracts'.
export function buildContractRoutes(
  pathPrefix: string,
  listName: string,
  detailName: string,
): RouteRecordRaw[] {
  return [
    {
      path: `${pathPrefix}/contracts`,
      name: listName,
      component: () => import('@/features/receivable/pages/ContractsPage.vue'),
      meta: { title: 'Contracts', permissions: ['contract.read'] },
    },
    {
      path: `${pathPrefix}/contracts/:id`,
      name: detailName,
      component: () => import('@/features/receivable/pages/ContractDetailPage.vue'),
      meta: { title: 'Detail Contract', permissions: ['contract.read'] },
    },
  ]
}
