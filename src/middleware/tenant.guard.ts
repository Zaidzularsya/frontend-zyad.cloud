import type { NavigationGuard } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'
import { useTenantStore } from '@/stores/tenant.store'

export const tenantGuard: NavigationGuard = (to) => {
  const auth = useAuthStore()
  const isSuperAdmin = auth.user?.roles?.includes('super_admin') ?? false

  if (to.meta.requiresPlatform && !isSuperAdmin) {
    return { name: 'forbidden' }
  }

  if (isSuperAdmin) return

  if (!to.meta.requiresTenant) return
  if (!useTenantStore().hasTenant) {
    return { name: 'select-tenant', query: { redirect: to.fullPath } }
  }
}
