import type { NavigationGuard } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'

export const authGuard: NavigationGuard = async (to) => {
  const auth = useAuthStore()
  await auth.bootstrap()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
}
