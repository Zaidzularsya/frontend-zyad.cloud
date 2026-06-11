import type { NavigationGuard } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'

export const guestGuard: NavigationGuard = async (to) => {
  const auth = useAuthStore()
  await auth.bootstrap()

  if (to.meta.guestOnly && auth.isAuthenticated) return { name: 'dashboard' }
}
