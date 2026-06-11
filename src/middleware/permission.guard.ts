import type { NavigationGuard } from 'vue-router'

import { hasPermission } from '@/lib/permission'
import { useAuthStore } from '@/stores/auth.store'

export const permissionGuard: NavigationGuard = (to) => {
  const required = to.meta.permissions
  if (!required?.length) return

  const auth = useAuthStore()
  if (!auth.user || !hasPermission(auth.user.permissions, required)) {
    return { name: 'forbidden' }
  }
}
