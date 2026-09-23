import type { RouteRecordRaw } from 'vue-router'

// Fase 1-2: Companies, Contacts, Leads, Pipelines, Deals. Activity/Quotation/
// Invoice/Integration land in later fases — see backend/docs/reference-crm.md
// "Fase Implementasi".
//
// namePrefix defaults to pathPrefix but can be set separately so the same
// pages can be mounted under a second path (e.g. platform admin's
// /platform/crm/*) without colliding with the tenant route names
// (crm-leads, crm-contacts, ...).
export function buildCrmRoutes(
  pathPrefix: string,
  namePrefix: string = pathPrefix,
): RouteRecordRaw[] {
  return [
    {
      path: `${pathPrefix}/companies`,
      name: `${namePrefix}-companies`,
      component: () => import('@/features/crm/companies/pages/CompaniesPage.vue'),
      meta: { title: 'Companies', permissions: ['company.read'] },
    },
    {
      path: `${pathPrefix}/contacts`,
      name: `${namePrefix}-contacts`,
      component: () => import('@/features/crm/contacts/pages/ContactsPage.vue'),
      meta: { title: 'Contacts', permissions: ['contact.read'] },
    },
    {
      path: `${pathPrefix}/leads`,
      name: `${namePrefix}-leads`,
      component: () => import('@/features/crm/leads/pages/LeadsPage.vue'),
      meta: { title: 'Leads', permissions: ['lead.read'] },
    },
    {
      path: `${pathPrefix}/leads/:id`,
      name: `${namePrefix}-lead-detail`,
      component: () => import('@/features/crm/leads/pages/LeadDetailPage.vue'),
      meta: { title: 'Detail Lead', permissions: ['lead.read'] },
    },
    {
      path: `${pathPrefix}/pipelines`,
      name: `${namePrefix}-pipelines`,
      component: () => import('@/features/crm/pipelines/pages/PipelinesPage.vue'),
      meta: { title: 'Pipelines', permissions: ['pipeline.read'] },
    },
    {
      path: `${pathPrefix}/deals`,
      name: `${namePrefix}-deals`,
      component: () => import('@/features/crm/deals/pages/DealsPage.vue'),
      meta: { title: 'Deals', permissions: ['deal.read'] },
    },
    {
      path: `${pathPrefix}/activities`,
      name: `${namePrefix}-activities`,
      component: () => import('@/features/crm/activities/pages/ActivitiesPage.vue'),
      meta: { title: 'Activities', permissions: ['activity.read'] },
    },
    {
      path: `${pathPrefix}/quotations`,
      name: `${namePrefix}-quotations`,
      component: () => import('@/features/crm/quotations/pages/QuotationsPage.vue'),
      meta: { title: 'Quotations', permissions: ['quotation.read'] },
    },
    {
      path: `${pathPrefix}/invoices`,
      name: `${namePrefix}-invoices`,
      component: () => import('@/features/crm/invoices/pages/InvoicesPage.vue'),
      meta: { title: 'Invoices', permissions: ['invoice.read'] },
    },
    {
      path: `${pathPrefix}/integrations`,
      name: `${namePrefix}-integrations`,
      component: () => import('@/features/crm/integrations/pages/IntegrationsPage.vue'),
      meta: { title: 'Integrations', permissions: ['integration.read'] },
    },
  ]
}
