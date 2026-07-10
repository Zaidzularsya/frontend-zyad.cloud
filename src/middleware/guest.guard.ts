import type { NavigationGuard } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'

export const guestGuard: NavigationGuard = async (to) => {
  const auth = useAuthStore()
  await auth.bootstrap()

  if (to.meta.guestOnly && auth.isAuthenticated) {
    // Sudah login: teruskan langsung ke tujuan redirect (mis. /app/checkout
    // dari CTA pricing) alih-alih memaksa ke dashboard.
    if (typeof to.query.redirect === 'string' && to.query.redirect.startsWith('/')) {
      return to.query.redirect
    }
    return { name: auth.user?.roles?.includes('super_admin') ? 'platform-dashboard' : 'dashboard' }
  }
}
