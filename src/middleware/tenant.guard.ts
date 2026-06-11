import type { NavigationGuard } from 'vue-router'

import { useTenantStore } from '@/stores/tenant.store'

export const tenantGuard: NavigationGuard = (to) => {
  if (!to.meta.requiresTenant) return
  if (!useTenantStore().hasTenant) {
    return { name: 'select-tenant', query: { redirect: to.fullPath } }
  }
}
