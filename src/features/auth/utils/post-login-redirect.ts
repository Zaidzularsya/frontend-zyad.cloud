import type { useAuthStore } from '@/stores/auth.store'

export function resolvePostLoginRedirect(
  auth: ReturnType<typeof useAuthStore>,
  redirectQuery: unknown,
): string {
  const isSuperAdmin = auth.user?.roles?.includes('super_admin')
  const defaultRedirect = isSuperAdmin ? '/platform/dashboard' : '/app/dashboard'
  return typeof redirectQuery === 'string' ? redirectQuery : defaultRedirect
}
