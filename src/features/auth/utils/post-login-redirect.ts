import type { useAuthStore } from '@/stores/auth.store'

export function resolvePostLoginRedirect(
  auth: ReturnType<typeof useAuthStore>,
  redirectQuery: unknown,
): string {
  const isSuperAdmin = auth.user?.roles?.includes('super_admin')
  const defaultRedirect = isSuperAdmin ? '/platform/dashboard' : '/app/dashboard'

  if (typeof redirectQuery !== 'string') return defaultRedirect

  // A super_admin can end up with a stray ?redirect=/app/... (old bookmark,
  // browser autocomplete, a stale link) from before they ever picked a
  // tenant. Honoring it would silently drop them into the tenant shell
  // instead of Platform Admin, which is never what they meant — send them
  // to the platform default instead. Any /platform/... redirect (or
  // anything else) is still honored as-is.
  if (isSuperAdmin && redirectQuery.startsWith('/app')) {
    return defaultRedirect
  }

  return redirectQuery
}
