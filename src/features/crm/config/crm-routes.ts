import type { RouteRecordRaw } from 'vue-router'

// Fase 1-2: Companies, Contacts, Leads, Pipelines, Deals. Activity/Quotation/
// Invoice/Integration land in later fases — see backend/docs/reference-crm.md
// "Fase Implementasi".
export function buildCrmRoutes(routePrefix: string): RouteRecordRaw[] {
  return [
    {
      path: `${routePrefix}/companies`,
      name: `${routePrefix}-companies`,
      component: () => import('@/features/crm/companies/pages/CompaniesPage.vue'),
      meta: { title: 'Companies', permissions: ['company.read'] },
    },
    {
      path: `${routePrefix}/contacts`,
      name: `${routePrefix}-contacts`,
      component: () => import('@/features/crm/contacts/pages/ContactsPage.vue'),
      meta: { title: 'Contacts', permissions: ['contact.read'] },
    },
    {
      path: `${routePrefix}/leads`,
      name: `${routePrefix}-leads`,
      component: () => import('@/features/crm/leads/pages/LeadsPage.vue'),
      meta: { title: 'Leads', permissions: ['lead.read'] },
    },
    {
      path: `${routePrefix}/pipelines`,
      name: `${routePrefix}-pipelines`,
      component: () => import('@/features/crm/pipelines/pages/PipelinesPage.vue'),
      meta: { title: 'Pipelines', permissions: ['pipeline.read'] },
    },
    {
      path: `${routePrefix}/deals`,
      name: `${routePrefix}-deals`,
      component: () => import('@/features/crm/deals/pages/DealsPage.vue'),
      meta: { title: 'Deals', permissions: ['deal.read'] },
    },
    {
      path: `${routePrefix}/activities`,
      name: `${routePrefix}-activities`,
      component: () => import('@/features/crm/activities/pages/ActivitiesPage.vue'),
      meta: { title: 'Activities', permissions: ['activity.read'] },
    },
    {
      path: `${routePrefix}/quotations`,
      name: `${routePrefix}-quotations`,
      component: () => import('@/features/crm/quotations/pages/QuotationsPage.vue'),
      meta: { title: 'Quotations', permissions: ['quotation.read'] },
    },
    {
      path: `${routePrefix}/invoices`,
      name: `${routePrefix}-invoices`,
      component: () => import('@/features/crm/invoices/pages/InvoicesPage.vue'),
      meta: { title: 'Invoices', permissions: ['invoice.read'] },
    },
    {
      path: `${routePrefix}/integrations`,
      name: `${routePrefix}-integrations`,
      component: () => import('@/features/crm/integrations/pages/IntegrationsPage.vue'),
      meta: { title: 'Integrations', permissions: ['integration.read'] },
    },
  ]
}
